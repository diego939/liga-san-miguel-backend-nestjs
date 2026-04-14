import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolDto, UpdateRolDto } from './dto/rol.dto';
import { RolQueryDto } from './dto/rol-query.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRolDto) {
    return this.prisma.rol.create({ data: dto });
  }

  async findAll(query: RolQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.RolWhereInput = query.q
      ? {
          descripcion: { contains: query.q, mode: 'insensitive' },
        }
      : {};
    const sortField = query.sortBy ?? 'id';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.RolOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.rol.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.rol.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const r = await this.prisma.rol.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException('Rol no encontrado');
    }
    return r;
  }

  async update(id: number, dto: UpdateRolDto) {
    await this.findOne(id);
    return this.prisma.rol.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.rol.delete({ where: { id } });
  }
}
