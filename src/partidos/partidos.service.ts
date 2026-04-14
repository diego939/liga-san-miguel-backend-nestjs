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

@Injectable()
export class PartidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validacion: ValidacionService,
  ) {}

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
    return this.prisma.partido.create({
      data: {
        torneoId,
        equipoLocalId: dto.equipoLocalId,
        equipoVisitanteId: dto.equipoVisitanteId,
        fecha: new Date(dto.fecha),
      },
      include: {
        equipoLocal: { include: { club: true } },
        equipoVisitante: { include: { club: true } },
      },
    });
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
    const sortField = query.sortBy ?? 'fecha';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.PartidoOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.partido.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          equipoLocal: { include: { club: true } },
          equipoVisitante: { include: { club: true } },
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
    const p = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        torneo: true,
        equipoLocal: { include: { club: true } },
        equipoVisitante: { include: { club: true } },
      },
    });
    if (!p) {
      throw new NotFoundException('Partido no encontrado');
    }
    return p;
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
    return this.prisma.partido.update({
      where: { id },
      data,
      include: {
        equipoLocal: { include: { club: true } },
        equipoVisitante: { include: { club: true } },
      },
    });
  }

  async updateEstado(id: number, dto: UpdateEstadoPartidoDto) {
    await this.findOne(id);
    await this.prisma.partido.update({
      where: { id },
      data: { estado: dto.estado },
    });
    if (dto.estado === EstadoPartido.FINALIZADO) {
      await this.validacion.consumirSuspensionesTrasFinalizar(id);
    }
    return this.findOne(id);
  }

  async updateMarcador(id: number, dto: UpdateMarcadorDto) {
    await this.findOne(id);
    return this.prisma.partido.update({
      where: { id },
      data: {
        golesLocal: dto.golesLocal,
        golesVisitante: dto.golesVisitante,
      },
    });
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

    await this.prisma.partidoJugador.deleteMany({ where: { partidoId: id } });
    const rows = [
      ...dto.local.map((l) => ({
        partidoId: id,
        jugadorId: l.jugadorId,
        equipoId: partido.equipoLocalId,
        titular: l.titular,
      })),
      ...dto.visitante.map((l) => ({
        partidoId: id,
        jugadorId: l.jugadorId,
        equipoId: partido.equipoVisitanteId,
        titular: l.titular,
      })),
    ];
    await this.prisma.partidoJugador.createMany({ data: rows });
    return this.prisma.partidoJugador.findMany({
      where: { partidoId: id },
      include: { jugador: true, equipo: { include: { club: true } } },
    });
  }

  listPlanilla(id: number) {
    return this.prisma.partidoJugador.findMany({
      where: { partidoId: id },
      include: { jugador: true, equipo: { include: { club: true } } },
    });
  }

  async assertJugadorEnPlanilla(partidoId: number, jugadorId: number) {
    const row = await this.prisma.partidoJugador.findFirst({
      where: { partidoId, jugadorId },
    });
    if (!row) {
      throw new BadRequestException(
        'RN-06: el jugador no está en la planilla del partido',
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

    return this.prisma.$transaction(async (tx) => {
      const ev = await tx.eventoPartido.create({
        data: {
          partidoId,
          jugadorId: dto.jugadorId,
          tipo: dto.tipo,
          minuto: dto.minuto,
        },
        include: { jugador: true },
      });
      if (dto.tipo === TipoEvento.ROJA) {
        await this.validacion.crearSuspensionPorRoja(
          tx,
          dto.jugadorId,
          partido.torneoId,
        );
      }
      if (dto.tipo === TipoEvento.AMARILLA) {
        await this.validacion.crearSuspensionPorAmarillasSiCorresponde(
          tx,
          dto.jugadorId,
          partido.torneoId,
        );
      }
      return ev;
    });
  }

  listEventos(partidoId: number) {
    return this.prisma.eventoPartido.findMany({
      where: { partidoId },
      orderBy: [{ minuto: 'asc' }, { id: 'asc' }],
      include: { jugador: true },
    });
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
    });
    const entra = await this.prisma.partidoJugador.findFirst({
      where: { partidoId, jugadorId: dto.jugadorEntraId },
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
    });
  }
}
