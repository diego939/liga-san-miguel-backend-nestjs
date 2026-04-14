import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { ValidacionService } from '../core/validacion.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CandidatosInscripcionQueryDto,
  CerrarInscripcionesBatchDto,
  CreateInscripcionBatchDto,
  CreateInscripcionDto,
  InscripcionListQueryDto,
} from './dto/inscripcion.dto';

@Injectable()
export class InscripcionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validacion: ValidacionService,
  ) {}

  async listByEquipo(equipoTorneoId: number, query: InscripcionListQueryDto) {
    const equipo = await this.ensureEquipo(equipoTorneoId);
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.InscripcionWhereInput = {
      equipoTorneoId,
      ...(query.soloActivas ? { fechaFin: null } : {}),
      ...(query.q
        ? {
            jugador: {
              OR: [
                { nombre: { contains: query.q, mode: 'insensitive' } },
                { apellido: { contains: query.q, mode: 'insensitive' } },
                { dni: { contains: query.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const sortField = query.sortBy ?? 'apellido';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.InscripcionOrderByWithRelationInput =
      sortField === 'apellido' ||
      sortField === 'nombre' ||
      sortField === 'dni'
        ? { jugador: { [sortField]: order } }
        : { [sortField]: order };
    const [items, total] = await Promise.all([
      this.prisma.inscripcion.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { jugador: true },
      }),
      this.prisma.inscripcion.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      clubId: equipo.clubId,
      clubNombre: equipo.club.nombre,
      torneoNombre: equipo.torneo.nombre,
    };
  }

  /**
   * Jugadores con pase vigente al club del equipo, excluye ya inscriptos activos aquí.
   * Filtros: dni (contiene), q (nombre/apellido).
   */
  async listCandidatosInscripcion(
    equipoTorneoId: number,
    query: CandidatosInscripcionQueryDto,
  ) {
    const equipo = await this.ensureEquipo(equipoTorneoId);
    const clubId = equipo.clubId;
    const at = new Date();

    const vinculos = await this.prisma.pase.findMany({
      where: {
        OR: [{ clubDestinoId: clubId }, { clubOrigenId: clubId }],
      },
      select: { jugadorId: true },
      distinct: ['jugadorId'],
    });
    let baseIds = vinculos.map((v) => v.jugadorId);

    const yaInscriptos = await this.prisma.inscripcion.findMany({
      where: { equipoTorneoId, fechaFin: null },
      select: { jugadorId: true },
    });
    const yaSet = new Set(yaInscriptos.map((i) => i.jugadorId));
    baseIds = baseIds.filter((id) => !yaSet.has(id));

    const elegibles = await this.validacion.filtrarJugadoresElegiblesParaClub(
      baseIds,
      clubId,
      at,
    );

    const andParts: Prisma.JugadorWhereInput[] = [
      { id: { in: elegibles.length > 0 ? elegibles : [-1] } },
    ];
    if (query.dni?.trim()) {
      andParts.push({
        dni: { contains: query.dni.trim(), mode: 'insensitive' },
      });
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      andParts.push({
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { apellido: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const whereJug: Prisma.JugadorWhereInput = { AND: andParts };

    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const orderBy: Prisma.JugadorOrderByWithRelationInput[] = [
      { apellido: 'asc' },
      { nombre: 'asc' },
    ];

    const [items, total] = await Promise.all([
      this.prisma.jugador.findMany({
        where: whereJug,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.jugador.count({ where: whereJug }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      clubId,
      clubNombre: equipo.club.nombre,
      torneoNombre: equipo.torneo.nombre,
    };
  }

  async createBatch(equipoTorneoId: number, dto: CreateInscripcionBatchDto) {
    const equipo = await this.ensureEquipo(equipoTorneoId);
    const porJugador = new Map<number, boolean>();
    for (const linea of dto.items) {
      porJugador.set(linea.jugadorId, linea.esForaneo);
    }
    const jugadorIds = [...porJugador.keys()];
    if (jugadorIds.length === 0) {
      throw new BadRequestException('Indicá al menos un jugador.');
    }
    const activas = await this.prisma.inscripcion.count({
      where: { equipoTorneoId, fechaFin: null },
    });
    if (activas + jugadorIds.length > equipo.torneo.maxJugadores) {
      throw new BadRequestException(
        'Se supera maxJugadores del torneo para este equipo.',
      );
    }

    const altasForaneos = [...porJugador.values()].filter(Boolean).length;
    if (altasForaneos > 0) {
      const foraneosActivos = await this.prisma.inscripcion.count({
        where: {
          equipoTorneoId,
          fechaFin: null,
          esForaneo: true,
        },
      });
      this.validacion.assertLimiteForaneosEnNomina(
        equipo.torneo.limiteForaneos,
        foraneosActivos,
        altasForaneos,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const jugadorId of jugadorIds) {
        await this.validacion.assertPuedeAltaInscripcion(
          jugadorId,
          equipoTorneoId,
          new Date(),
        );
        const duplicado = await tx.inscripcion.findFirst({
          where: {
            jugadorId,
            equipoTorneoId,
            fechaFin: null,
          },
        });
        if (duplicado) {
          throw new ConflictException(
            `El jugador ${jugadorId} ya tiene inscripción activa en este equipo.`,
          );
        }
        await tx.inscripcion.create({
          data: {
            jugadorId,
            equipoTorneoId,
            esForaneo: porJugador.get(jugadorId) ?? false,
          },
        });
      }
    });

    return this.prisma.inscripcion.findMany({
      where: {
        equipoTorneoId,
        jugadorId: { in: jugadorIds },
        fechaFin: null,
      },
      include: { jugador: true, equipoTorneo: { include: { club: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async cerrarBatch(dto: CerrarInscripcionesBatchDto) {
    const ids = [...new Set(dto.ids)];
    if (ids.length === 0) {
      throw new BadRequestException('Indicá al menos una inscripción.');
    }
    const ahora = new Date();
    let cerradas = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const id of ids) {
        const ins = await tx.inscripcion.findUnique({ where: { id } });
        if (!ins) {
          throw new NotFoundException(`Inscripción ${id} no encontrada`);
        }
        if (ins.fechaFin) {
          continue;
        }
        await tx.inscripcion.update({
          where: { id },
          data: { fechaFin: ahora },
        });
        cerradas++;
      }
    });
    return { cerradas };
  }

  async preview(equipoTorneoId: number, jugadorId: number) {
    try {
      await this.validacion.assertPuedeAltaInscripcion(
        jugadorId,
        equipoTorneoId,
        new Date(),
      );
      return { puede: true as const, motivo: null as string | null };
    } catch (e: unknown) {
      if (e instanceof HttpException) {
        const res = e.getResponse();
        const raw =
          typeof res === 'string'
            ? res
            : (res as { message?: string | string[] }).message;
        const motivo = Array.isArray(raw) ? raw.join(', ') : String(raw);
        return { puede: false as const, motivo };
      }
      return {
        puede: false as const,
        motivo:
          e instanceof Error
            ? e.message
            : 'No cumple requisitos de inscripción',
      };
    }
  }

  async create(equipoTorneoId: number, dto: CreateInscripcionDto) {
    const equipo = await this.ensureEquipo(equipoTorneoId);
    await this.validacion.assertPuedeAltaInscripcion(
      dto.jugadorId,
      equipoTorneoId,
      new Date(),
    );

    const activas = await this.prisma.inscripcion.count({
      where: { equipoTorneoId, fechaFin: null },
    });
    if (activas >= equipo.torneo.maxJugadores) {
      throw new BadRequestException(
        'Se alcanzó maxJugadores del torneo para este equipo.',
      );
    }

    const duplicado = await this.prisma.inscripcion.findFirst({
      where: {
        jugadorId: dto.jugadorId,
        equipoTorneoId,
        fechaFin: null,
      },
    });
    if (duplicado) {
      throw new ConflictException(
        'El jugador ya tiene una inscripción activa en este equipo.',
      );
    }

    if (dto.esForaneo) {
      const foraneosActivos = await this.prisma.inscripcion.count({
        where: {
          equipoTorneoId,
          fechaFin: null,
          esForaneo: true,
        },
      });
      this.validacion.assertLimiteForaneosEnNomina(
        equipo.torneo.limiteForaneos,
        foraneosActivos,
        1,
      );
    }

    return this.prisma.inscripcion.create({
      data: {
        jugadorId: dto.jugadorId,
        equipoTorneoId,
        esForaneo: dto.esForaneo,
      },
      include: { jugador: true, equipoTorneo: { include: { club: true } } },
    });
  }

  /**
   * RN-09: cierra inscripción actual y abre otra en otro equipo del mismo torneo.
   */
  async cambiarEquipoEnTorneo(
    torneoId: number,
    jugadorId: number,
    equipoDestinoId: number,
    esForaneo: boolean,
  ) {
    const destino = await this.prisma.equipoTorneo.findFirst({
      where: { id: equipoDestinoId, torneoId },
      include: { torneo: true, club: true },
    });
    if (!destino) {
      throw new NotFoundException('Equipo destino no válido para el torneo');
    }

    const actual = await this.prisma.inscripcion.findFirst({
      where: {
        jugadorId,
        equipoTorneo: { torneoId },
        fechaFin: null,
      },
      include: { equipoTorneo: true },
    });
    if (!actual) {
      throw new BadRequestException(
        'No hay inscripción activa en este torneo para el jugador.',
      );
    }
    if (actual.equipoTorneoId === equipoDestinoId) {
      throw new BadRequestException('El jugador ya está en ese equipo.');
    }

    await this.validacion.assertPuedeAltaInscripcion(
      jugadorId,
      equipoDestinoId,
      new Date(),
    );

    const activasDestino = await this.prisma.inscripcion.count({
      where: { equipoTorneoId: equipoDestinoId, fechaFin: null },
    });
    if (activasDestino >= destino.torneo.maxJugadores) {
      throw new BadRequestException('Equipo destino sin cupo.');
    }

    if (esForaneo) {
      const foraneosEnDestino = await this.prisma.inscripcion.count({
        where: {
          equipoTorneoId: equipoDestinoId,
          fechaFin: null,
          esForaneo: true,
        },
      });
      this.validacion.assertLimiteForaneosEnNomina(
        destino.torneo.limiteForaneos,
        foraneosEnDestino,
        1,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.inscripcion.update({
        where: { id: actual.id },
        data: { fechaFin: new Date() },
      });
      return tx.inscripcion.create({
        data: {
          jugadorId,
          equipoTorneoId: equipoDestinoId,
          esForaneo,
        },
        include: {
          jugador: true,
          equipoTorneo: { include: { club: true } },
        },
      });
    });
  }

  async cerrar(inscripcionId: number) {
    const ins = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
    });
    if (!ins) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    return this.prisma.inscripcion.update({
      where: { id: inscripcionId },
      data: { fechaFin: new Date() },
      include: { jugador: true },
    });
  }

  private async ensureEquipo(equipoTorneoId: number) {
    const e = await this.prisma.equipoTorneo.findUnique({
      where: { id: equipoTorneoId },
      include: { torneo: true, club: true },
    });
    if (!e) {
      throw new NotFoundException('Equipo en torneo no encontrado');
    }
    return e;
  }
}
