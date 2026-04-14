import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoPase } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaseDto,
  PaseQueryDto,
  RenovarPaseDto,
  UpdatePaseDto,
} from './dto/pase.dto';

@Injectable()
export class PasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaseDto) {
    if (dto.tipo === TipoPase.TEMPORAL && !dto.fechaFin) {
      throw new BadRequestException(
        'Un pase TEMPORAL requiere fechaFin (vencimiento).',
      );
    }
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;
    if (fechaFin && fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'fechaFin debe ser posterior a fechaInicio',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // RN-02: un solo pase activo — cerrar los que siguen vigentes al inicio del nuevo
      await tx.pase.updateMany({
        where: {
          jugadorId: dto.jugadorId,
          fechaInicio: { lte: fechaInicio },
          OR: [{ fechaFin: null }, { fechaFin: { gt: fechaInicio } }],
        },
        data: { fechaFin: fechaInicio },
      });

      return tx.pase.create({
        data: {
          jugadorId: dto.jugadorId,
          clubOrigenId: dto.clubOrigenId ?? null,
          clubDestinoId: dto.clubDestinoId,
          tipo: dto.tipo,
          fechaInicio,
          fechaFin,
        },
        include: { clubOrigen: true, clubDestino: true },
      });
    });
  }

  async findAll(query: PaseQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const ref = query.fechaReferencia
      ? new Date(query.fechaReferencia)
      : new Date();

    const andParts: Prisma.PaseWhereInput[] = [];
    if (query.jugadorId) {
      andParts.push({ jugadorId: query.jugadorId });
    }
    if (query.clubId) {
      andParts.push({
        OR: [
          { clubOrigenId: query.clubId },
          { clubDestinoId: query.clubId },
        ],
      });
    }
    if (query.q) {
      andParts.push({
        jugador: {
          OR: [
            { nombre: { contains: query.q, mode: 'insensitive' } },
            { apellido: { contains: query.q, mode: 'insensitive' } },
            { dni: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      });
    }

    const activoEnRef: Prisma.PaseWhereInput = {
      fechaInicio: { lte: ref },
      OR: [{ fechaFin: null }, { fechaFin: { gt: ref } }],
    };

    if (query.estado === 'activo') {
      andParts.push(activoEnRef);
    } else if (query.estado === 'vencido') {
      andParts.push({ NOT: activoEnRef });
    }

    const where: Prisma.PaseWhereInput =
      andParts.length > 0 ? { AND: andParts } : {};

    const sortField = query.sortBy ?? 'fechaInicio';
    const order = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.PaseOrderByWithRelationInput = {
      [sortField]: order,
    };

    const [items, total] = await Promise.all([
      this.prisma.pase.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { clubOrigen: true, clubDestino: true, jugador: true },
      }),
      this.prisma.pase.count({ where }),
    ]);

    return { items, total, page, limit, fechaReferencia: ref.toISOString() };
  }

  /** Nuevo pase con los mismos clubes/jugador (renovación). */
  async renovar(id: number, dto: RenovarPaseDto) {
    const prev = await this.findOne(id);
    const tipo = dto.tipo ?? prev.tipo;
    return this.create({
      jugadorId: prev.jugadorId,
      clubOrigenId: prev.clubOrigenId,
      clubDestinoId: prev.clubDestinoId,
      tipo,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
    });
  }

  async findOne(id: number) {
    const p = await this.prisma.pase.findUnique({
      where: { id },
      include: { clubOrigen: true, clubDestino: true, jugador: true },
    });
    if (!p) {
      throw new NotFoundException('Pase no encontrado');
    }
    return p;
  }

  async update(id: number, dto: UpdatePaseDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.fechaInicio) {
      data.fechaInicio = new Date(dto.fechaInicio);
    }
    if (dto.fechaFin !== undefined) {
      data.fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;
    }
    if (dto.tipo) {
      data.tipo = dto.tipo;
    }
    return this.prisma.pase.update({
      where: { id },
      data,
      include: { clubOrigen: true, clubDestino: true },
    });
  }
}
