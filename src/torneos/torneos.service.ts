import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TorneoQueryDto } from './dto/torneo-query.dto';
import { CreateTorneoDto, UpdateTorneoDto } from './dto/torneo.dto';

@Injectable()
export class TorneosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTorneoDto) {
    const fi = new Date(dto.fechaInicio);
    const ff = new Date(dto.fechaFin);
    if (ff < fi) {
      throw new BadRequestException('fechaFin debe ser >= fechaInicio');
    }
    return this.prisma.torneo.create({
      data: {
        nombre: dto.nombre,
        categoria: dto.categoria,
        formato: dto.formato,
        fechaInicio: fi,
        fechaFin: ff,
        limiteForaneos: dto.limiteForaneos ?? null,
        maxJugadores: dto.maxJugadores,
      },
    });
  }

  async findAll(query: TorneoQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.TorneoWhereInput = query.q
      ? {
          OR: [
            { nombre: { contains: query.q, mode: 'insensitive' } },
            { categoria: { contains: query.q, mode: 'insensitive' } },
            { formato: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const sortField = query.sortBy ?? 'fechaInicio';
    const order = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.TorneoOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.torneo.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.torneo.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const t = await this.prisma.torneo.findUnique({ where: { id } });
    if (!t) {
      throw new NotFoundException('Torneo no encontrado');
    }
    return t;
  }

  async update(id: number, dto: UpdateTorneoDto) {
    await this.findOne(id);
    const data: Prisma.TorneoUpdateInput = {};
    if (dto.nombre !== undefined) {
      data.nombre = dto.nombre;
    }
    if (dto.categoria !== undefined) {
      data.categoria = dto.categoria;
    }
    if (dto.formato !== undefined) {
      data.formato = dto.formato;
    }
    if (dto.fechaInicio !== undefined) {
      data.fechaInicio = new Date(dto.fechaInicio);
    }
    if (dto.fechaFin !== undefined) {
      data.fechaFin = new Date(dto.fechaFin);
    }
    if (dto.limiteForaneos !== undefined) {
      data.limiteForaneos = dto.limiteForaneos;
    }
    if (dto.maxJugadores !== undefined) {
      data.maxJugadores = dto.maxJugadores;
    }
    return this.prisma.torneo.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.torneo.delete({ where: { id } });
  }

  async resumen(id: number) {
    const t = await this.findOne(id);
    const [equipos, partidosPorEstado] = await Promise.all([
      this.prisma.equipoTorneo.count({ where: { torneoId: id } }),
      this.prisma.partido.groupBy({
        by: ['estado'],
        where: { torneoId: id },
        _count: { id: true },
      }),
    ]);
    return {
      torneo: t,
      equiposInscriptos: equipos,
      partidosPorEstado: Object.fromEntries(
        partidosPorEstado.map((r) => [r.estado, r._count.id]),
      ),
    };
  }
}
