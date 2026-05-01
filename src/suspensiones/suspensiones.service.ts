import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SuspensionQueryDto } from './dto/suspension-query.dto';
import { CreateSuspensionDto, UpdateSuspensionDto } from './dto/suspension.dto';

@Injectable()
export class SuspensionesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseFechaHasta(fechaRaw: string): Date {
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)
        ? `${fechaRaw}T23:59:59.999`
        : fechaRaw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('fechaHasta inválida.');
    }
    return parsed;
  }

  private activeWhere(at: Date): Prisma.SuspensionWhereInput {
    return {
      OR: [
        { partidosRestantes: { gt: 0 } },
        { fechaHasta: { gte: at } },
      ],
    };
  }

  /**
   * Club del jugador en el torneo de la suspensión (inscripción activa sin fechaFin).
   */
  private async enrichSuspensionList<
    T extends { jugadorId: number; torneoId: number },
  >(rows: T[]): Promise<Array<T & { clubNombre: string | null }>> {
    if (rows.length === 0) {
      return [];
    }
    const jugadorIds = [...new Set(rows.map((r) => r.jugadorId))];
    const torneoIds = [...new Set(rows.map((r) => r.torneoId))];
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: {
        jugadorId: { in: jugadorIds },
        fechaFin: null,
        equipoTorneo: { torneoId: { in: torneoIds } },
      },
      include: { equipoTorneo: { include: { club: true } } },
    });
    const clubByJugadorTorneo = new Map<string, string>();
    for (const ins of inscripciones) {
      const tid = ins.equipoTorneo.torneoId;
      const key = `${ins.jugadorId}-${tid}`;
      if (!clubByJugadorTorneo.has(key)) {
        clubByJugadorTorneo.set(key, ins.equipoTorneo.club.nombre);
      }
    }
    return rows.map((r) => ({
      ...r,
      clubNombre:
        clubByJugadorTorneo.get(`${r.jugadorId}-${r.torneoId}`) ?? null,
    }));
  }

  private buildSuspensionData(
    dto: CreateSuspensionDto | UpdateSuspensionDto,
    opts?: { requireCriteria?: boolean },
  ): { motivo?: string; partidosRestantes?: number; fechaHasta?: Date } {
    const hasPartidos = dto.partidosRestantes !== undefined;
    const hasFecha = dto.fechaHasta !== undefined;
    if (hasPartidos && hasFecha) {
      throw new BadRequestException(
        'La suspensión debe definirse por partidosRestantes o por fechaHasta, no ambos.',
      );
    }
    if (!hasPartidos && !hasFecha && opts?.requireCriteria) {
      throw new BadRequestException(
        'La suspensión debe incluir partidosRestantes o fechaHasta.',
      );
    }
    return {
      ...(hasPartidos ? { partidosRestantes: dto.partidosRestantes } : {}),
      ...(hasFecha ? { fechaHasta: this.parseFechaHasta(dto.fechaHasta!) } : {}),
      ...(dto.motivo !== undefined ? { motivo: dto.motivo } : {}),
    };
  }

  async create(dto: CreateSuspensionDto) {
    const data = this.buildSuspensionData(dto, { requireCriteria: true });
    const created = await this.prisma.suspension.create({
      data: {
        jugadorId: dto.jugadorId,
        torneoId: dto.torneoId,
        motivo: dto.motivo,
        ...data,
      },
      include: { jugador: true, torneo: true },
    });
    const [enriched] = await this.enrichSuspensionList([created]);
    return enriched;
  }

  async findAll(query: SuspensionQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const now = new Date();
    const where: Prisma.SuspensionWhereInput = {
      ...(query.torneoId ? { torneoId: query.torneoId } : {}),
      ...(query.jugadorId ? { jugadorId: query.jugadorId } : {}),
      ...(query.activas ? this.activeWhere(now) : {}),
    };
    const sortField = query.sortBy ?? 'id';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.SuspensionOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [rawItems, total] = await Promise.all([
      this.prisma.suspension.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { jugador: true, torneo: true },
      }),
      this.prisma.suspension.count({ where }),
    ]);
    const items = await this.enrichSuspensionList(rawItems);
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
    const [enriched] = await this.enrichSuspensionList([s]);
    return enriched;
  }

  async update(id: number, dto: UpdateSuspensionDto) {
    const existing = await this.prisma.suspension.findUnique({
      where: { id },
      include: { jugador: true, torneo: true },
    });
    if (!existing) {
      throw new NotFoundException('Suspensión no encontrada');
    }

    const hasPartidos = dto.partidosRestantes !== undefined;
    const hasFecha = dto.fechaHasta !== undefined;
    if (hasPartidos && hasFecha) {
      throw new BadRequestException(
        'La suspensión debe definirse por partidosRestantes o por fechaHasta, no ambos.',
      );
    }

    const data: Prisma.SuspensionUpdateInput = {};
    if (dto.motivo !== undefined) {
      data.motivo = dto.motivo;
    }
    if (hasPartidos) {
      data.partidosRestantes = dto.partidosRestantes!;
      data.fechaHasta = null;
    } else if (hasFecha) {
      data.fechaHasta = this.parseFechaHasta(dto.fechaHasta!);
      data.partidosRestantes = null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No hay datos para actualizar');
    }

    const updated = await this.prisma.suspension.update({
      where: { id },
      data,
      include: { jugador: true, torneo: true },
    });
    const [enriched] = await this.enrichSuspensionList([updated]);
    return enriched;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.suspension.delete({ where: { id } });
  }

  async suspendidosPorTorneo(torneoId: number) {
    const now = new Date();
    const rows = await this.prisma.suspension.findMany({
      where: { torneoId, ...this.activeWhere(now) },
      orderBy: { id: 'desc' },
      include: { jugador: true, torneo: true },
    });
    return this.enrichSuspensionList(rows);
  }
}
