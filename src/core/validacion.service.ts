import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoPartido, Pase, Prisma, TipoEvento, TipoPase } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  parseEstadoPartido,
  queryPartidoScalarsById,
} from '../partidos/partido-scalar.raw';
import { PrismaService } from '../prisma/prisma.service';

/** Reglas de negocio RN-01 … RN-12 (validación en tiempo real). */
@Injectable()
export class ValidacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get appTimeZone(): string {
    return (
      this.config.get<string>('APP_TIMEZONE') ??
      'America/Argentina/Buenos_Aires'
    );
  }

  private activeSuspensionWhere(at: Date): Prisma.SuspensionWhereInput {
    return {
      OR: [
        { partidosRestantes: { gt: 0 } },
        { fechaHasta: { gte: at } },
      ],
    };
  }

  /** Texto legible para el mensaje de error cuando hay suspensión activa. */
  private mensajeDetalleSuspensionActiva(s: {
    motivo: string;
    partidosRestantes: number | null;
    fechaHasta: Date | null;
  }): string {
    const partes: string[] = [`Motivo: ${s.motivo}.`];
    if (s.partidosRestantes != null && s.partidosRestantes > 0) {
      partes.push(`Partidos restantes de suspensión: ${s.partidosRestantes}.`);
    }
    if (s.fechaHasta != null) {
      const hasta = DateTime.fromJSDate(s.fechaHasta)
        .setZone(this.appTimeZone)
        .toFormat('dd/MM/yyyy HH:mm');
      partes.push(`Suspendido hasta: ${hasta}.`);
    }
    return partes.join(' ');
  }

  /**
   * Inicio y fin del día civil en `appTimeZone` que contiene el instante `fecha`
   * (para solapes de inscripción / pase con la fecha del partido).
   */
  private rangoDiaCivil(fecha: Date): { inicio: Date; fin: Date } {
    const local = DateTime.fromMillis(fecha.getTime(), {
      zone: this.appTimeZone,
    });
    const start = local.startOf('day');
    const end = local.endOf('day');
    return { inicio: start.toJSDate(), fin: end.toJSDate() };
  }

  /** Inscripción o pase con vigencia que solapa el día civil de `fechaReferencia`. */
  private whereVigenteEnDiaDe(
    fechaReferencia: Date,
  ): {
    fechaInicio: { lte: Date };
    OR: ({ fechaFin: null } | { fechaFin: { gt: Date } })[];
  } {
    const { inicio, fin } = this.rangoDiaCivil(fechaReferencia);
    return {
      fechaInicio: { lte: fin },
      OR: [{ fechaFin: null }, { fechaFin: { gt: inicio } }],
    };
  }

  /**
   * Misma regla que getClubElegibleId, sin I/O.
   * `pases` debe ser del mismo jugador, ordenados por fechaInicio descendente.
   */
  clubElegibleDesdeHistorialPases(
    pases: Pick<
      Pase,
      'tipo' | 'fechaInicio' | 'fechaFin' | 'clubDestinoId' | 'clubOrigenId'
    >[],
    at: Date,
  ): number | null {
    const activo = pases.find(
      (p) => p.fechaInicio <= at && (p.fechaFin === null || p.fechaFin > at),
    );
    if (activo) {
      return activo.clubDestinoId;
    }

    const temporalCerrado = pases
      .filter(
        (p) =>
          p.tipo === TipoPase.TEMPORAL &&
          p.fechaFin !== null &&
          p.fechaFin <= at,
      )
      .sort((a, b) => b.fechaFin!.getTime() - a.fechaFin!.getTime())[0];
    if (temporalCerrado) {
      return temporalCerrado.clubOrigenId;
    }

    return null;
  }

  /**
   * Jugadores cuyo **club elegible** en el instante `at` coincide con `clubId`
   * (misma regla que `getClubElegibleId`, no basta un pase histórico al club que solape el día).
   */
  async filtrarJugadoresElegiblesParaClub(
    candidatos: number[],
    clubId: number,
    at: Date = new Date(),
  ): Promise<number[]> {
    if (candidatos.length === 0) return [];
    const uniq = [...new Set(candidatos)];
    type Row = Pick<
      Pase,
      'jugadorId' | 'tipo' | 'fechaInicio' | 'fechaFin' | 'clubDestinoId' | 'clubOrigenId'
    >;
    const rows = await this.prisma.pase.findMany({
      where: { jugadorId: { in: uniq } },
      orderBy: { fechaInicio: 'desc' },
      select: {
        jugadorId: true,
        tipo: true,
        fechaInicio: true,
        fechaFin: true,
        clubDestinoId: true,
        clubOrigenId: true,
      },
    });
    const byJugador = new Map<number, Row[]>();
    for (const r of rows) {
      const arr = byJugador.get(r.jugadorId);
      if (arr) arr.push(r);
      else byJugador.set(r.jugadorId, [r]);
    }
    const out: number[] = [];
    for (const id of uniq) {
      const list = byJugador.get(id);
      if (!list?.length) continue;
      list.sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
      const elegible = this.clubElegibleDesdeHistorialPases(list, at);
      if (elegible === clubId) out.push(id);
    }
    return out;
  }

  /**
   * RN-03 + RN-04: club donde puede competir el jugador en la fecha dada.
   * Tras vencer un pase TEMPORAL, la elegibilidad vuelve al club de origen de ese pase.
   */
  async getClubElegibleId(
    jugadorId: number,
    at: Date = new Date(),
  ): Promise<number | null> {
    const pases = await this.prisma.pase.findMany({
      where: { jugadorId },
      orderBy: { fechaInicio: 'desc' },
    });
    return this.clubElegibleDesdeHistorialPases(pases, at);
  }

  /** Pase cuya ventana temporal incluye `at` (RN-02). */
  async getPaseActivoEnFecha(jugadorId: number, at: Date) {
    return this.prisma.pase.findFirst({
      where: {
        jugadorId,
        fechaInicio: { lte: at },
        OR: [{ fechaFin: null }, { fechaFin: { gt: at } }],
      },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  /**
   * RN-03 + RN-05 + RN-12: alta en lista de buena fe — pase activo con destino al **club** del equipo.
   */
  async assertPuedeAltaInscripcion(
    jugadorId: number,
    equipoTorneoId: number,
    fechaReferencia: Date = new Date(),
  ): Promise<void> {
    const equipo = await this.prisma.equipoTorneo.findUnique({
      where: { id: equipoTorneoId },
      include: { club: true },
    });
    if (!equipo) {
      throw new NotFoundException('Equipo en torneo no encontrado');
    }
    const jugador = await this.prisma.jugador.findUnique({
      where: { id: jugadorId },
    });
    if (!jugador) {
      throw new NotFoundException('Jugador no encontrado');
    }
    const clubElegibleId = await this.getClubElegibleId(
      jugadorId,
      fechaReferencia,
    );
    if (clubElegibleId !== equipo.clubId) {
      if (clubElegibleId === null) {
        throw new BadRequestException(
          // RN-03 / RN-05:
          'El jugador no puede inscribirse en este equipo: en la fecha de referencia no tiene un club elegible según su historial de pases.',
        );
      }
      const clubElegible = await this.prisma.club.findUnique({
        where: { id: clubElegibleId },
        select: { nombre: true },
      });
      const nombreClub = clubElegible?.nombre ?? 'otro club';
      throw new BadRequestException(
        // RN-03 / RN-05:
        `El jugador no puede inscribirse en este equipo: actualmente solo puede jugar para el club «${nombreClub}».`,
      );
    }
  }

  /**
   * Elegibilidad para jugar (planilla): inscripción y pase evaluados en el **instante actual**
   * (no usa la fecha/hora del partido). Suspensión en el torneo sigue aplicando.
   */
  async assertJugadorPuedeJugarEnPlanilla(
    partidoId: number,
    jugadorId: number,
    equipoTorneoId: number,
  ): Promise<{ esForaneo: boolean }> {
    const ahora = new Date();
    const partido = await queryPartidoScalarsById(this.prisma, partidoId);
    if (!partido) {
      throw new NotFoundException('Partido no encontrado');
    }
    if (
      partido.equipoLocalId !== equipoTorneoId &&
      partido.equipoVisitanteId !== equipoTorneoId
    ) {
      throw new BadRequestException(
        'El equipo no participa en este partido como local ni visitante.',
      );
    }

    const equipo = await this.prisma.equipoTorneo.findUnique({
      where: { id: equipoTorneoId },
      include: { club: true },
    });
    if (!equipo) {
      throw new NotFoundException('Equipo en torneo no encontrado');
    }
    if (equipo.torneoId !== partido.torneoId) {
      throw new BadRequestException(
        'El equipo no pertenece al torneo de este partido.',
      );
    }

    const inscripcion = await this.prisma.inscripcion.findFirst({
      where: {
        jugadorId,
        equipoTorneoId,
        ...this.whereVigenteEnDiaDe(ahora),
      },
    });
    if (!inscripcion) {
      throw new BadRequestException(
        'RN-05 / RN-06: el jugador no está inscripto en este equipo en el torneo a la fecha/hora actual.',
      );
    }

    await this.assertPuedeAltaInscripcion(
      jugadorId,
      equipoTorneoId,
      ahora,
    );

    const suspendido = await this.prisma.suspension.findFirst({
      where: {
        jugadorId,
        torneoId: partido.torneoId,
        ...this.activeSuspensionWhere(ahora),
      },
      select: {
        motivo: true,
        partidosRestantes: true,
        fechaHasta: true,
      },
    });
    if (suspendido) {
      throw new BadRequestException(
        // RN-06 / RN-08:
        'El jugador está suspendido y no puede jugar este partido. ' +
          this.mensajeDetalleSuspensionActiva(suspendido),
      );
    }

    return { esForaneo: inscripcion.esForaneo };
  }

  /**
   * RN-07: límite de foráneos por partido y por equipo (en la planilla).
   */
  assertLimiteForaneos(
    limiteTorneo: number | null,
    foraneosEnPlanilla: number,
  ): void {
    if (limiteTorneo === null || limiteTorneo === undefined) {
      return;
    }
    if (foraneosEnPlanilla > limiteTorneo) {
      throw new BadRequestException(
        //RN-07:
        `Se supera el límite de foráneos por partido (${limiteTorneo}).`,
      );
    }
  }

  /**
   * Mismo tope `limiteForaneos` del torneo aplicado a la nómina (lista de buena fe del equipo).
   */
  assertLimiteForaneosEnNomina(
    limiteTorneo: number | null | undefined,
    foraneosActivosEnEquipo: number,
    altasForaneos: number,
  ): void {
    if (limiteTorneo === null || limiteTorneo === undefined) {
      return;
    }
    if (altasForaneos <= 0) {
      return;
    }
    if (foraneosActivosEnEquipo + altasForaneos > limiteTorneo) {
      throw new BadRequestException(
        //RN-07:
        `El límite de foráneos en la nómina del torneo es ${limiteTorneo}. ` +
          `Hay ${foraneosActivosEnEquipo} foráneo(s) inscripto(s); esta operación sumaría ${altasForaneos}.`,
      );
    }
  }

  /** Tras registrar ROJA (RN-08). */
  async crearSuspensionPorRoja(
    tx: Prisma.TransactionClient,
    jugadorId: number,
    torneoId: number,
    suspension: { partidosRestantes?: number; fechaHasta?: Date },
  ) {
    await tx.suspension.create({
      data: {
        jugadorId,
        torneoId,
        motivo: 'Tarjeta roja',
        partidosRestantes: suspension.partidosRestantes ?? null,
        fechaHasta: suspension.fechaHasta ?? null,
      },
    });
  }

  /** Tras acumular 5 amarillas en el torneo (RN-08). */
  async crearSuspensionPorAmarillasSiCorresponde(
    tx: Prisma.TransactionClient,
    jugadorId: number,
    torneoId: number,
  ) {
    const totalAmarillas = await tx.eventoPartido.count({
      where: {
        tipo: TipoEvento.AMARILLA,
        jugadorId,
        partido: { torneoId },
      },
    });
    if (totalAmarillas > 0 && totalAmarillas % 5 === 0) {
      await tx.suspension.create({
        data: {
          jugadorId,
          torneoId,
          motivo: 'Acumulación de 5 tarjetas amarillas en el torneo',
          partidosRestantes: 1,
          fechaHasta: null,
        },
      });
    }
  }

  /**
   * Al finalizar partido: descuenta una fecha de suspensión a jugadores del torneo
   * que estaban inscriptos en alguno de los dos equipos y no figuraron en la planilla.
   */
  async consumirSuspensionesTrasFinalizar(partidoId: number): Promise<void> {
    const partido = await queryPartidoScalarsById(this.prisma, partidoId);
    if (!partido || parseEstadoPartido(partido.estado) !== EstadoPartido.FINALIZADO) {
      return;
    }

    const enPlanilla = await this.prisma.partidoJugador.findMany({
      where: { partidoId },
      select: { jugadorId: true },
    });
    const idsEnPlanilla = new Set(enPlanilla.map((p) => p.jugadorId));

    const equiposIds = [partido.equipoLocalId, partido.equipoVisitanteId];
    const inscriptos = await this.prisma.inscripcion.findMany({
      where: {
        equipoTorneoId: { in: equiposIds },
        fechaInicio: { lte: partido.fecha },
        OR: [{ fechaFin: null }, { fechaFin: { gt: partido.fecha } }],
      },
      select: { jugadorId: true },
    });
    const candidatos = [...new Set(inscriptos.map((i) => i.jugadorId))].filter(
      (id) => !idsEnPlanilla.has(id),
    );

    for (const jugadorId of candidatos) {
      const s = await this.prisma.suspension.findFirst({
        where: {
          jugadorId,
          torneoId: partido.torneoId,
          partidosRestantes: { gt: 0 },
        },
        orderBy: { id: 'asc' },
      });
      if (s) {
        await this.prisma.suspension.update({
          where: { id: s.id },
          data: { partidosRestantes: { decrement: 1 } },
        });
      }
    }
  }
}
