import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPartido, Pase, Prisma, TipoEvento, TipoPase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Reglas de negocio RN-01 … RN-12 (validación en tiempo real). */
@Injectable()
export class ValidacionService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Devuelve los ids de jugadores (de `candidatos`) cuyo club elegible coincide con `clubId`.
   * Carga los pases en una sola consulta.
   */
  async filtrarJugadoresElegiblesParaClub(
    candidatos: number[],
    clubId: number,
    at: Date = new Date(),
  ): Promise<number[]> {
    if (candidatos.length === 0) return [];
    const uniq = [...new Set(candidatos)];
    const allPases = await this.prisma.pase.findMany({
      where: { jugadorId: { in: uniq } },
      orderBy: { fechaInicio: 'desc' },
    });
    const byJug = new Map<number, typeof allPases>();
    for (const p of allPases) {
      const arr = byJug.get(p.jugadorId) ?? [];
      arr.push(p);
      byJug.set(p.jugadorId, arr);
    }
    const elegibles: number[] = [];
    for (const id of uniq) {
      const pases = byJug.get(id) ?? [];
      const cid = this.clubElegibleDesdeHistorialPases(pases, at);
      if (cid === clubId) elegibles.push(id);
    }
    return elegibles;
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
   * RN-05 + RN-12: alta en lista de buena fe (solo pase + club; no exige inscripción previa).
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
    const clubElegible = await this.getClubElegibleId(
      jugadorId,
      fechaReferencia,
    );
    if (clubElegible !== equipo.clubId) {
      throw new BadRequestException(
        'RN-03 / RN-05: el jugador no tiene pase activo vigente hacia el club de este equipo.',
      );
    }
  }

  /**
   * RN-05 + RN-12: inscripción activa y pase al club del equipo.
   */
  async assertInscripcionPermitida(
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

    const inscripcion = await this.prisma.inscripcion.findFirst({
      where: {
        jugadorId,
        equipoTorneoId,
        fechaInicio: { lte: fechaReferencia },
        OR: [{ fechaFin: null }, { fechaFin: { gt: fechaReferencia } }],
      },
    });
    if (!inscripcion) {
      throw new BadRequestException(
        'RN-05 / RN-06: el jugador no tiene inscripción activa en este equipo (lista de buena fe).',
      );
    }

    const clubElegible = await this.getClubElegibleId(
      jugadorId,
      fechaReferencia,
    );
    if (clubElegible !== equipo.clubId) {
      throw new BadRequestException(
        'RN-03 / RN-05: el jugador no tiene pase activo vigente hacia el club de este equipo en la fecha de referencia.',
      );
    }
  }

  /**
   * RN-06, RN-07, RN-12: valida un jugador en planilla de partido.
   */
  async assertJugadorPuedeJugarEnPlanilla(
    partidoId: number,
    jugadorId: number,
    equipoTorneoId: number,
  ): Promise<{ esForaneo: boolean }> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      include: { torneo: true },
    });
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

    await this.assertInscripcionPermitida(
      jugadorId,
      equipoTorneoId,
      partido.fecha,
    );

    const inscripcion = await this.prisma.inscripcion.findFirst({
      where: {
        jugadorId,
        equipoTorneoId,
        fechaInicio: { lte: partido.fecha },
        OR: [{ fechaFin: null }, { fechaFin: { gt: partido.fecha } }],
      },
    });
    if (!inscripcion) {
      throw new BadRequestException('Inscripción no encontrada.');
    }

    const suspendido = await this.prisma.suspension.findFirst({
      where: {
        jugadorId,
        torneoId: partido.torneoId,
        partidosRestantes: { gt: 0 },
      },
    });
    if (suspendido) {
      throw new BadRequestException(
        'RN-06 / RN-08: el jugador está suspendido y no puede jugar este partido.',
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
        `RN-07: se supera el límite de foráneos por partido (${limiteTorneo}).`,
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
        `RN-07: el límite de foráneos en la nómina del torneo es ${limiteTorneo}. ` +
          `Hay ${foraneosActivosEnEquipo} foráneo(s) inscripto(s); esta operación sumaría ${altasForaneos}.`,
      );
    }
  }

  /** Tras registrar ROJA (RN-08). */
  async crearSuspensionPorRoja(
    tx: Prisma.TransactionClient,
    jugadorId: number,
    torneoId: number,
  ) {
    await tx.suspension.create({
      data: {
        jugadorId,
        torneoId,
        motivo: 'Tarjeta roja',
        partidosRestantes: 1,
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
        },
      });
    }
  }

  /**
   * Al finalizar partido: descuenta una fecha de suspensión a jugadores del torneo
   * que estaban inscriptos en alguno de los dos equipos y no figuraron en la planilla.
   */
  async consumirSuspensionesTrasFinalizar(partidoId: number): Promise<void> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
    });
    if (!partido || partido.estado !== EstadoPartido.FINALIZADO) {
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
