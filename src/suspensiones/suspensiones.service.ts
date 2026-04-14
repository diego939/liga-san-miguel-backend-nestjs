import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SuspensionQueryDto } from './dto/suspension-query.dto';
import { CreateSuspensionDto, UpdateSuspensionDto } from './dto/suspension.dto';

@Injectable()
export class SuspensionesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateSuspensionDto) {
    return this.prisma.suspension.create({
      data: {
        jugadorId: dto.jugadorId,
        torneoId: dto.torneoId,
        motivo: dto.motivo,
        partidosRestantes: dto.partidosRestantes,
      },
      include: { jugador: true, torneo: true },
    });
  }

  async findAll(query: SuspensionQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.SuspensionWhereInput = {
      ...(query.torneoId ? { torneoId: query.torneoId } : {}),
      ...(query.jugadorId ? { jugadorId: query.jugadorId } : {}),
      ...(query.activas ? { partidosRestantes: { gt: 0 } } : {}),
    };
    const sortField = query.sortBy ?? 'id';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.SuspensionOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.suspension.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { jugador: true, torneo: true },
      }),
      this.prisma.suspension.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const s = await this.prisma.suspension.findUnique({
      where: { id },
      include: { jugador: true, torneo: true },
    });
    if (!s) {
      throw new NotFoundException('Suspensión no encontrada');
    }
    return s;
  }

  async update(id: number, dto: UpdateSuspensionDto) {
    await this.findOne(id);
    return this.prisma.suspension.update({
      where: { id },
      data: dto,
      include: { jugador: true, torneo: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.suspension.delete({ where: { id } });
  }

  suspendidosPorTorneo(torneoId: number) {
    return this.prisma.suspension.findMany({
      where: { torneoId, partidosRestantes: { gt: 0 } },
      orderBy: { id: 'desc' },
      include: { jugador: true, torneo: true },
    });
  }
}
