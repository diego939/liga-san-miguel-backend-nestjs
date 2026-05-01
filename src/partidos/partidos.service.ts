import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPartido, Prisma, TipoEvento } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { ValidacionService } from '../core/validacion.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCambioDto,
  CreateEventoPartidoDto,
  CreatePartidoDto,
  PartidoTorneoQueryDto,
  ReemplazarPlanillaDto,
  UpdateEstadoPartidoDto,
  UpdateMarcadorDto,
  UpdatePartidoDto,
} from './dto/partido.dto';
import {
  cambioConJugadoresSelect,
  eventoPartidoConJugadorSelect,
  partidoJugadorCambioFindSelect,
  partidoJugadorListaSelect,
} from './partido-planilla.select';
import {
  parseEstadoPartido,
  queryPartidoScalarsById,
} from './partido-scalar.raw';

/** Evita orderBy dinámico con nombres de columna arbitrarios (p. ej. sortBy=existe → P2022). */
const PARTIDO_LIST_SORT_FIELDS = ['fecha', 'estado', 'id'] as const;
type PartidoListSortField = (typeof PARTIDO_LIST_SORT_FIELDS)[number];

function partidoListSortField(raw?: string): PartidoListSortField {
  if (
    raw &&
    (PARTIDO_LIST_SORT_FIELDS as readonly string[]).includes(raw)
  ) {
    return raw as PartidoListSortField;
  }
  return 'fecha';
}

/** orderBy sin clave dinámica (evita valores raros en el AST de Prisma). */
function partidoListOrderBy(
  sortField: PartidoListSortField,
  order: Prisma.SortOrder,
): Prisma.PartidoOrderByWithRelationInput {
  if (sortField === 'estado') {
    return { estado: order };
  }
  if (sortField === 'id') {
    return { id: order };
  }
  return { fecha: order };
}

@Injectable()
export class PartidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validacion: ValidacionService,
  ) {}

  private parseFechaHasta(fechaRaw: string): Date {
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
        ? `${fechaRaw}T23:59:59.999`
        : fechaRaw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('fechaHasta inválida para suspensión.');
    }
    return parsed;
  }

  private parseSuspensionRojaConfig(dto: CreateEventoPartidoDto): {
    partidosRestantes?: number;
    fechaHasta?: Date;
  } {
    if (dto.tipo !== TipoEvento.ROJA) {
      return {};
    }
    const partidosRestantes = dto.suspensionRoja?.partidosRestantes;
    const fechaHastaRaw = dto.suspensionRoja?.fechaHasta;
    const hasPartidos = partidosRestantes !== undefined;
    const hasFecha = fechaHastaRaw !== undefined;
    if (hasPartidos && hasFecha) {
      throw new BadRequestException(
        'Para ROJA definí suspensión por partidosRestantes o por fechaHasta, no ambos.',
      );
    }
    if (!hasPartidos && !hasFecha) {
      throw new BadRequestException(
        'Para ROJA debés indicar partidosRestantes o fechaHasta.',
      );
    }
    if (hasPartidos) {
      return { partidosRestantes };
    }
    const fechaHasta = this.parseFechaHasta(fechaHastaRaw!);
    return { fechaHasta };
  }

  /**
   * Persiste `golesLocal` / `golesVisitante` a partir de eventos GOL y GOL_EN_CONTRA
   * y la planilla actual (equipo de cada jugador). Si no hay eventos de gol, no modifica
   * el marcador (puede haberse cargado solo con PATCH /marcador).
   */
  private async recalcularMarcadorDesdeEventos(partidoId: number): Promise<void> {
    const meta = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!meta) {
      return;
    }
    const conGol = await this.prisma.eventoPartido.findMany({
      where: {
        partidoId,
        tipo: { in: [TipoEvento.GOL, TipoEvento.GOL_EN_CONTRA] },
      },
      select: { jugadorId: true, tipo: true },
    });
    if (conGol.length === 0) {
      return;
    }
    const planilla = await this.prisma.partidoJugador.findMany({
      where: { partidoId },
      select: { jugadorId: true, equipoId: true },
    });
    const equipoPorJugador = new Map(
      planilla.map((r) => [r.jugadorId, r.equipoId]),
    );
    let gl = 0;
    let gv = 0;
    for (const e of conGol) {
      const eqId = equipoPorJugador.get(e.jugadorId);
      if (eqId == null) {
        continue;
      }
      const esLocal = eqId === meta.equipoLocalId;
      if (e.tipo === TipoEvento.GOL) {
        if (esLocal) gl += 1;
        else gv += 1;
      } else {
        if (esLocal) gv += 1;
        else gl += 1;
      }
    }
    await this.prisma.partido.update({
      where: { id: partidoId },
      data: { golesLocal: gl, golesVisitante: gv },
    });
  }

  async create(torneoId: number, dto: CreatePartidoDto) {
    if (dto.equipoLocalId === dto.equipoVisitanteId) {
      throw new BadRequestException('Local y visitante deben ser distintos');
    }
    const [local, visit] = await Promise.all([
      this.prisma.equipoTorneo.findFirst({
        where: { id: dto.equipoLocalId, torneoId },
      }),
      this.prisma.equipoTorneo.findFirst({
        where: { id: dto.equipoVisitanteId, torneoId },
      }),
    ]);
    if (!local || !visit) {
      throw new BadRequestException(
        'Los equipos deben pertenecer al torneo indicado',
      );
    }
    const created = await this.prisma.partido.create({
      data: {
        torneoId,
        equipoLocalId: dto.equipoLocalId,
        equipoVisitanteId: dto.equipoVisitanteId,
        fecha: new Date(dto.fecha),
      },
      select: { id: true },
    });
    return this.findOne(created.id);
  }

  async listByTorneo(torneoId: number, query: PartidoTorneoQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.PartidoWhereInput = {
      torneoId,
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.q
        ? {
            OR: [
              {
                equipoLocal: {
                  club: {
                    nombre: { contains: query.q, mode: 'insensitive' },
                  },
                },
              },
              {
                equipoVisitante: {
                  club: {
                    nombre: { contains: query.q, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const sortField = partidoListSortField(query.sortBy);
    const order: Prisma.SortOrder =
      query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy = partidoListOrderBy(sortField, order);
    const [items, total] = await Promise.all([
      this.prisma.partido.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          torneoId: true,
          equipoLocalId: true,
          equipoVisitanteId: true,
          fecha: true,
          golesLocal: true,
          golesVisitante: true,
          estado: true,
          equipoLocal: {
            select: {
              id: true,
              torneoId: true,
              clubId: true,
              club: { select: { id: true, nombre: true, logo: true } },
            },
          },
          equipoVisitante: {
            select: {
              id: true,
              torneoId: true,
              clubId: true,
              club: { select: { id: true, nombre: true, logo: true } },
            },
          },
        },
      }),
      this.prisma.partido.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /** Validación en tiempo real antes de agregar a la planilla (RN-06, RN-07, RN-12). */
  async previewJugadorEnPlanilla(
    partidoId: number,
    jugadorId: number,
    equipoTorneoId: number,
  ) {
    try {
      const r = await this.validacion.assertJugadorPuedeJugarEnPlanilla(
        partidoId,
        jugadorId,
        equipoTorneoId,
      );
      return { puede: true as const, esForaneo: r.esForaneo, motivo: null };
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        const res = e.getResponse();
        const raw =
          typeof res === 'string'
            ? res
            : (res as { message?: string | string[] }).message;
        const motivo = Array.isArray(raw) ? raw.join(', ') : String(raw);
        return { puede: false as const, esForaneo: false, motivo };
      }
      return {
        puede: false as const,
        esForaneo: false,
        motivo:
          e instanceof Error ? e.message : 'No puede incorporarse a la planilla',
      };
    }
  }

  async findOne(id: number) {
    const row = await queryPartidoScalarsById(this.prisma, id);
    if (!row) {
      throw new NotFoundException('Partido no encontrado');
    }
    const estado = parseEstadoPartido(row.estado);
    const jugSel = {
      id: true,
      dni: true,
      nombre: true,
      apellido: true,
      telefono: true,
      fechaNacimiento: true,
      createdAt: true,
    } as const;
    const [
      torneo,
      equipoLocal,
      equipoVisitante,
      capitanLocalJugador,
      capitanVisitanteJugador,
    ] = await Promise.all([
      this.prisma.torneo.findUnique({ where: { id: row.torneoId } }),
      this.prisma.equipoTorneo.findUnique({
        where: { id: row.equipoLocalId },
        include: { club: true },
      }),
      this.prisma.equipoTorneo.findUnique({
        where: { id: row.equipoVisitanteId },
        include: { club: true },
      }),
      row.capitanLocalJugadorId != null
        ? this.prisma.jugador.findUnique({
            where: { id: row.capitanLocalJugadorId },
            select: jugSel,
          })
        : Promise.resolve(null),
      row.capitanVisitanteJugadorId != null
        ? this.prisma.jugador.findUnique({
            where: { id: row.capitanVisitanteJugadorId },
            select: jugSel,
          })
        : Promise.resolve(null),
    ]);
    if (!torneo || !equipoLocal || !equipoVisitante) {
      throw new NotFoundException('Partido no encontrado');
    }
    return {
      id: row.id,
      torneoId: row.torneoId,
      equipoLocalId: row.equipoLocalId,
      equipoVisitanteId: row.equipoVisitanteId,
      fecha: row.fecha,
      golesLocal: row.golesLocal,
      golesVisitante: row.golesVisitante,
      estado,
      capitanLocalJugadorId: row.capitanLocalJugadorId,
      capitanVisitanteJugadorId: row.capitanVisitanteJugadorId,
      arbitroPrincipal: row.arbitroPrincipal,
      juezLinea1: row.juezLinea1,
      juezLinea2: row.juezLinea2,
      observaciones: row.observaciones,
      torneo,
      equipoLocal,
      equipoVisitante,
      capitanLocalJugador,
      capitanVisitanteJugador,
    };
  }

  async update(id: number, dto: UpdatePartidoDto) {
    const partido = await this.findOne(id);
    if (partido.estado === EstadoPartido.FINALIZADO) {
      throw new BadRequestException('Partido finalizado no editable');
    }
    const data: Record<string, unknown> = {};
    if (dto.fecha) {
      data.fecha = new Date(dto.fecha);
    }
    if (dto.equipoLocalId !== undefined) {
      data.equipoLocalId = dto.equipoLocalId;
    }
    if (dto.equipoVisitanteId !== undefined) {
      data.equipoVisitanteId = dto.equipoVisitanteId;
    }
    await this.prisma.partido.update({
      where: { id },
      data,
    });
    return this.findOne(id);
  }

  async updateEstado(id: number, dto: UpdateEstadoPartidoDto) {
    await this.findOne(id);
    await this.prisma.partido.update({
      where: { id },
      data: { estado: dto.estado },
    });
    if (dto.estado === EstadoPartido.FINALIZADO) {
      await this.recalcularMarcadorDesdeEventos(id);
      await this.validacion.consumirSuspensionesTrasFinalizar(id);
    }
    return this.findOne(id);
  }

  async updateMarcador(id: number, dto: UpdateMarcadorDto) {
    await this.findOne(id);
    await this.prisma.partido.update({
      where: { id },
      data: {
        golesLocal: dto.golesLocal,
        golesVisitante: dto.golesVisitante,
      },
    });
    return this.findOne(id);
  }

  /** RN-06, RN-07, RN-12 */
  async reemplazarPlanilla(id: number, dto: ReemplazarPlanillaDto) {
    const partido = await this.findOne(id);
    const torneo = partido.torneo;

    const idsLocal = dto.local.map((l) => l.jugadorId);
    const idsVis = dto.visitante.map((l) => l.jugadorId);
    if (new Set(idsLocal).size !== idsLocal.length) {
      throw new BadRequestException('Jugadores duplicados en local');
    }
    if (new Set(idsVis).size !== idsVis.length) {
      throw new BadRequestException('Jugadores duplicados en visitante');
    }

    if (
      dto.capitanLocalJugadorId != null &&
      !dto.local.some((l) => l.jugadorId === dto.capitanLocalJugadorId)
    ) {
      throw new BadRequestException(
        'El capitán local debe ser un jugador de la planilla local',
      );
    }
    if (
      dto.capitanVisitanteJugadorId != null &&
      !dto.visitante.some((l) => l.jugadorId === dto.capitanVisitanteJugadorId)
    ) {
      throw new BadRequestException(
        'El capitán visitante debe ser un jugador de la planilla visitante',
      );
    }

    let foraneosLocal = 0;
    for (const line of dto.local) {
      const r = await this.validacion.assertJugadorPuedeJugarEnPlanilla(
        id,
        line.jugadorId,
        partido.equipoLocalId,
      );
      if (r.esForaneo) {
        foraneosLocal += 1;
      }
    }
    this.validacion.assertLimiteForaneos(torneo.limiteForaneos, foraneosLocal);

    let foraneosVis = 0;
    for (const line of dto.visitante) {
      const r = await this.validacion.assertJugadorPuedeJugarEnPlanilla(
        id,
        line.jugadorId,
        partido.equipoVisitanteId,
      );
      if (r.esForaneo) {
        foraneosVis += 1;
      }
    }
    this.validacion.assertLimiteForaneos(torneo.limiteForaneos, foraneosVis);

    const partidoActa: Prisma.PartidoUpdateInput = {};
    if (dto.capitanLocalJugadorId !== undefined) {
      partidoActa.capitanLocalJugador =
        dto.capitanLocalJugadorId == null
          ? { disconnect: true }
          : { connect: { id: dto.capitanLocalJugadorId } };
    }
    if (dto.capitanVisitanteJugadorId !== undefined) {
      partidoActa.capitanVisitanteJugador =
        dto.capitanVisitanteJugadorId == null
          ? { disconnect: true }
          : { connect: { id: dto.capitanVisitanteJugadorId } };
    }
    if (dto.arbitroPrincipal !== undefined) {
      partidoActa.arbitroPrincipal = dto.arbitroPrincipal;
    }
    if (dto.juezLinea1 !== undefined) {
      partidoActa.juezLinea1 = dto.juezLinea1;
    }
    if (dto.juezLinea2 !== undefined) {
      partidoActa.juezLinea2 = dto.juezLinea2;
    }
    if (dto.observaciones !== undefined) {
      partidoActa.observaciones = dto.observaciones;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.partidoJugador.deleteMany({ where: { partidoId: id } });
      const rows = [
        ...dto.local.map((l) => ({
          partidoId: id,
          jugadorId: l.jugadorId,
          equipoId: partido.equipoLocalId,
          titular: l.titular,
          numeroCamiseta:
            l.numeroCamiseta === undefined ? null : l.numeroCamiseta,
        })),
        ...dto.visitante.map((l) => ({
          partidoId: id,
          jugadorId: l.jugadorId,
          equipoId: partido.equipoVisitanteId,
          titular: l.titular,
          numeroCamiseta:
            l.numeroCamiseta === undefined ? null : l.numeroCamiseta,
        })),
      ];
      await tx.partidoJugador.createMany({ data: rows });
      if (Object.keys(partidoActa).length > 0) {
        await tx.partido.update({ where: { id }, data: partidoActa });
      }
    });
    await this.recalcularMarcadorDesdeEventos(id);
    return this.prisma.partidoJugador.findMany({
      where: { partidoId: id },
      select: partidoJugadorListaSelect,
    });
  }

  listPlanilla(id: number) {
    return this.prisma.partidoJugador.findMany({
      where: { partidoId: id },
      select: partidoJugadorListaSelect,
    });
  }

  async assertJugadorEnPlanilla(partidoId: number, jugadorId: number) {
    const row = await this.prisma.partidoJugador.findFirst({
      where: { partidoId, jugadorId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(
        //RN-06:
        'El jugador no está en la planilla del partido',
      );
    }
  }

  async addEvento(partidoId: number, dto: CreateEventoPartidoDto) {
    const partido = await this.findOne(partidoId);
    if (partido.estado !== EstadoPartido.EN_JUEGO) {
      throw new BadRequestException(
        'Solo se registran eventos con partido EN_JUEGO',
      );
    }
    await this.assertJugadorEnPlanilla(partidoId, dto.jugadorId);

    const suspensionRoja = this.parseSuspensionRojaConfig(dto);
    const ev = await this.prisma.$transaction(async (tx) => {
      const created = await tx.eventoPartido.create({
        data: {
          partidoId,
          jugadorId: dto.jugadorId,
          tipo: dto.tipo,
          minuto: dto.minuto,
          notas: dto.notas ?? null,
        },
        select: eventoPartidoConJugadorSelect,
      });
      if (dto.tipo === TipoEvento.ROJA) {
        await this.validacion.crearSuspensionPorRoja(
          tx,
          dto.jugadorId,
          partido.torneoId,
          suspensionRoja,
        );
      }
      if (dto.tipo === TipoEvento.AMARILLA) {
        await this.validacion.crearSuspensionPorAmarillasSiCorresponde(
          tx,
          dto.jugadorId,
          partido.torneoId,
        );
      }
      return created;
    });
    if (
      dto.tipo === TipoEvento.GOL ||
      dto.tipo === TipoEvento.GOL_EN_CONTRA
    ) {
      await this.recalcularMarcadorDesdeEventos(partidoId);
    }
    return ev;
  }

  listEventos(partidoId: number) {
    return this.prisma.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ minuto: 'asc' }, { id: 'asc' }],
      select: eventoPartidoConJugadorSelect,
    });
  }

  private static readonly MOTIVO_SUSPENSION_ROJA = 'Tarjeta roja';
  private static readonly MOTIVO_SUSPENSION_AMARILLAS =
    'Acumulación de 5 tarjetas amarillas en el torneo';

  async deleteEvento(partidoId: number, eventoId: number) {
    const partido = await this.findOne(partidoId);
    if (partido.estado !== EstadoPartido.EN_JUEGO) {
      throw new BadRequestException(
        'Solo se eliminan eventos con partido EN_JUEGO',
      );
    }
    const ev = await this.prisma.eventoPartido.findFirst({
      where: { id: eventoId, partidoId },
      include: { partido: { select: { torneoId: true } } },
    });
    if (!ev) {
      throw new NotFoundException('Evento no encontrado');
    }
    const torneoId = ev.partido.torneoId;
    const { tipo, jugadorId } = ev;

    let oldAmarillaCount = 0;
    if (tipo === TipoEvento.AMARILLA) {
      oldAmarillaCount = await this.prisma.eventoPartido.count({
        where: {
          tipo: TipoEvento.AMARILLA,
          jugadorId,
          partido: { torneoId },
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.eventoPartido.delete({ where: { id: eventoId } });

      if (tipo === TipoEvento.ROJA) {
        const susp = await tx.suspension.findFirst({
          where: {
            jugadorId,
            torneoId,
            motivo: PartidosService.MOTIVO_SUSPENSION_ROJA,
          },
          orderBy: { id: 'desc' },
        });
        if (susp) {
          await tx.suspension.delete({ where: { id: susp.id } });
        }
      }

      if (tipo === TipoEvento.AMARILLA) {
        const newCount = oldAmarillaCount - 1;
        if (
          oldAmarillaCount > 0 &&
          oldAmarillaCount % 5 === 0 &&
          newCount % 5 !== 0
        ) {
          const susp = await tx.suspension.findFirst({
            where: {
              jugadorId,
              torneoId,
              motivo: PartidosService.MOTIVO_SUSPENSION_AMARILLAS,
            },
            orderBy: { id: 'desc' },
          });
          if (susp) {
            await tx.suspension.delete({ where: { id: susp.id } });
          }
        }
      }
    });

    if (
      tipo === TipoEvento.GOL ||
      tipo === TipoEvento.GOL_EN_CONTRA
    ) {
      const remaining = await this.prisma.eventoPartido.count({
        where: {
          partidoId,
          tipo: { in: [TipoEvento.GOL, TipoEvento.GOL_EN_CONTRA] },
        },
      });
      if (remaining === 0) {
        await this.prisma.partido.update({
          where: { id: partidoId },
          data: { golesLocal: 0, golesVisitante: 0 },
        });
      } else {
        await this.recalcularMarcadorDesdeEventos(partidoId);
      }
    }
  }

  async deleteCambio(partidoId: number, cambioId: number) {
    const partido = await this.findOne(partidoId);
    if (partido.estado !== EstadoPartido.EN_JUEGO) {
      throw new BadRequestException(
        'Solo se eliminan cambios con partido EN_JUEGO',
      );
    }
    const row = await this.prisma.cambio.findFirst({
      where: { id: cambioId, partidoId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Cambio no encontrado');
    }
    await this.prisma.cambio.delete({ where: { id: cambioId } });
  }

  async addCambio(partidoId: number, dto: CreateCambioDto) {
    const partido = await this.findOne(partidoId);
    if (partido.estado !== EstadoPartido.EN_JUEGO) {
      throw new BadRequestException(
        'Solo se registran cambios con partido EN_JUEGO',
      );
    }
    const sale = await this.prisma.partidoJugador.findFirst({
      where: { partidoId, jugadorId: dto.jugadorSaleId },
      select: partidoJugadorCambioFindSelect,
    });
    const entra = await this.prisma.partidoJugador.findFirst({
      where: { partidoId, jugadorId: dto.jugadorEntraId },
      select: partidoJugadorCambioFindSelect,
    });
    if (!sale || !entra) {
      throw new BadRequestException(
        'Ambos jugadores deben estar en la planilla del partido',
      );
    }
    if (sale.equipoId !== entra.equipoId) {
      throw new BadRequestException(
        'El cambio debe ser dentro del mismo equipo',
      );
    }
    return this.prisma.cambio.create({
      data: {
        partidoId,
        jugadorSaleId: dto.jugadorSaleId,
        jugadorEntraId: dto.jugadorEntraId,
        minuto: dto.minuto,
      },
    });
  }

  listCambios(partidoId: number) {
    return this.prisma.cambio.findMany({
      where: { partidoId },
      orderBy: { minuto: 'asc' },
      select: cambioConJugadoresSelect,
    });
  }
}
