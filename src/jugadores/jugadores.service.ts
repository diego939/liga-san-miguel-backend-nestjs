import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, TipoPase } from '@prisma/client';
import { ValidacionService } from '../core/validacion.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePage } from '../common/dto/pagination-query.dto';
import {
  CreateJugadorDto,
  JugadorQueryDto,
  UpdateJugadorDto,
} from './dto/jugador.dto';

@Injectable()
export class JugadoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validacion: ValidacionService,
  ) {}

  /** Solo dígitos; evita duplicados lógicos (ej. 12.345.678 vs 12345678). */
  private normalizeDni(dni: string): string {
    return dni.replace(/[^0-9]/g, '');
  }

  /** Normaliza strings opcionales para persistencia (vacío -> null). */
  private normalizeOptionalText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Comprueba si ya hay un jugador cuyo DNI, normalizado a dígitos, coincide.
   * Incluye filas antiguas guardadas con puntos u otros separadores.
   */
  private async assertDniNoDuplicado(
    db: PrismaClient | Prisma.TransactionClient,
    dniNorm: string,
    exceptJugadorId?: number,
  ): Promise<void> {
    if (dniNorm.length < 6) {
      throw new BadRequestException('DNI inválido');
    }
    const rows =
      exceptJugadorId == null
        ? await db.$queryRaw<{ id: number }[]>(
            Prisma.sql`
              SELECT id FROM "Jugador"
              WHERE regexp_replace(dni, '[^0-9]', '', 'g') = ${dniNorm}
              LIMIT 1
            `,
          )
        : await db.$queryRaw<{ id: number }[]>(
            Prisma.sql`
              SELECT id FROM "Jugador"
              WHERE regexp_replace(dni, '[^0-9]', '', 'g') = ${dniNorm}
                AND id <> ${exceptJugadorId}
              LIMIT 1
            `,
          );
    if (rows.length > 0) {
      //RN-01:
      throw new ConflictException('Ya existe un jugador con ese DNI');
    }
  }

  async create(dto: CreateJugadorDto) {
    const dniNorm = this.normalizeDni(dto.dni);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertDniNoDuplicado(tx, dniNorm);
        const j = await tx.jugador.create({
          data: {
            dni: dniNorm,
            nombre: dto.nombre,
            apellido: dto.apellido,
            telefono: dto.telefono,
            anioNacimiento: dto.anioNacimiento,
            fechaNacimiento:
              dto.fechaNacimiento != null &&
              String(dto.fechaNacimiento).trim() !== ''
                ? new Date(dto.fechaNacimiento)
                : null,
            nacionalidad: this.normalizeOptionalText(dto.nacionalidad),
          },
        });

        if (dto.clubDestinoInicialId != null) {
          const club = await tx.club.findUnique({
            where: { id: dto.clubDestinoInicialId },
          });
          if (!club) {
            throw new BadRequestException('Club destino inicial no encontrado');
          }
          const fechaInicio = new Date();
          await tx.pase.updateMany({
            where: {
              jugadorId: j.id,
              fechaInicio: { lte: fechaInicio },
              OR: [{ fechaFin: null }, { fechaFin: { gt: fechaInicio } }],
            },
            data: { fechaFin: fechaInicio },
          });
          await tx.pase.create({
            data: {
              jugadorId: j.id,
              clubOrigenId: null,
              clubDestinoId: dto.clubDestinoInicialId,
              tipo: TipoPase.DEFINITIVO,
              fechaInicio,
              fechaFin: null,
            } as unknown as Prisma.PaseUncheckedCreateInput,
          });
        }

        return j;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        //RN-01:
        throw new ConflictException('Ya existe un jugador con ese DNI');
      }
      throw e;
    }
  }

  async findAll(query: JugadorQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.JugadorWhereInput = {};
    if (query.dni) {
      where.dni = { contains: query.dni, mode: 'insensitive' };
    }
    if (query.q) {
      where.OR = [
        { nombre: { contains: query.q, mode: 'insensitive' } },
        { apellido: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const sortField = query.sortBy ?? 'apellido';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.JugadorOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.jugador.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.jugador.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const j = await this.prisma.jugador.findUnique({ where: { id } });
    if (!j) {
      throw new NotFoundException('Jugador no encontrado');
    }
    return j;
  }

  async update(id: number, dto: UpdateJugadorDto) {
    await this.findOne(id);
    let dniNorm: string | undefined;
    if (dto.dni !== undefined) {
      dniNorm = this.normalizeDni(dto.dni);
      await this.assertDniNoDuplicado(this.prisma, dniNorm, id);
    }
    try {
      return await this.prisma.jugador.update({
        where: { id },
        data: {
          ...(dniNorm !== undefined ? { dni: dniNorm } : {}),
          nombre: dto.nombre,
          apellido: dto.apellido,
          telefono: dto.telefono,
          ...(dto.anioNacimiento !== undefined
            ? { anioNacimiento: dto.anioNacimiento }
            : {}),
          ...(dto.fechaNacimiento !== undefined
            ? {
                fechaNacimiento:
                  dto.fechaNacimiento === null ||
                  (typeof dto.fechaNacimiento === 'string' &&
                    dto.fechaNacimiento.trim() === '')
                    ? null
                    : new Date(dto.fechaNacimiento),
              }
            : {}),
          ...(dto.nacionalidad !== undefined
            ? { nacionalidad: this.normalizeOptionalText(dto.nacionalidad) }
            : {}),
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        //RN-01:
        throw new ConflictException('Ya existe un jugador con ese DNI');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.eventoPartido.deleteMany({ where: { jugadorId: id } });
      await tx.partidoJugador.deleteMany({ where: { jugadorId: id } });
      await tx.inscripcion.deleteMany({ where: { jugadorId: id } });
      await tx.suspension.deleteMany({ where: { jugadorId: id } });
      await tx.pase.deleteMany({ where: { jugadorId: id } });
      await tx.jugador.delete({ where: { id } });
    });
  }

  async clubActual(id: number, fecha?: string) {
    await this.findOne(id);
    const at = fecha ? new Date(fecha) : new Date();
    const clubId = await this.validacion.getClubElegibleId(id, at);
    let clubNombre: string | null = null;
    if (clubId) {
      const club = await this.prisma.club.findUnique({ where: { id: clubId } });
      clubNombre = club?.nombre ?? null;
    }
    return {
      clubId,
      clubNombre,
      fechaReferencia: at.toISOString(),
    };
  }

  listPases(jugadorId: number) {
    return this.prisma.pase.findMany({
      where: { jugadorId },
      orderBy: { fechaInicio: 'desc' },
      include: { clubOrigen: true, clubDestino: true },
    });
  }

  listInscripciones(jugadorId: number, torneoId?: number) {
    return this.prisma.inscripcion.findMany({
      where: {
        jugadorId,
        ...(torneoId ? { equipoTorneo: { torneoId } } : {}),
      },
      orderBy: { fechaInicio: 'desc' },
      include: {
        equipoTorneo: { include: { club: true, torneo: true } },
      },
    });
  }

  listEventos(jugadorId: number) {
    return this.prisma.eventoPartido.findMany({
      where: { jugadorId },
      orderBy: [{ partidoId: 'desc' }, { minuto: 'asc' }],
      include: { partido: { include: { torneo: true } } },
    });
  }

  async listSuspensiones(jugadorId: number) {
    await this.findOne(jugadorId);
    return this.prisma.suspension.findMany({
      where: { jugadorId },
      include: { torneo: true },
      orderBy: { id: 'desc' },
    });
  }

  /** Participaciones en torneos (historial de inscripciones). */
  async listTorneosJugados(jugadorId: number) {
    await this.findOne(jugadorId);
    return this.prisma.inscripcion.findMany({
      where: { jugadorId },
      include: {
        equipoTorneo: { include: { torneo: true, club: true } },
      },
      orderBy: { fechaInicio: 'desc' },
    });
  }
}
