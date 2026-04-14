import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ClubQueryDto } from './dto/club-query.dto';
import {
  CreateClubDto,
  CreateClubPersonalDto,
  UpdateClubDto,
  UpdateClubPersonalDto,
} from './dto/club.dto';

@Injectable()
export class ClubesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClubDto) {
    return this.prisma.club.create({ data: dto });
  }

  async findAll(query: ClubQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.ClubWhereInput = query.q
      ? {
          nombre: { contains: query.q, mode: 'insensitive' },
        }
      : {};
    const sortField = query.sortBy ?? 'nombre';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.ClubOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.club.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.club.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const c = await this.prisma.club.findUnique({ where: { id } });
    if (!c) {
      throw new NotFoundException('Club no encontrado');
    }
    return c;
  }

  async update(id: number, dto: UpdateClubDto) {
    await this.findOne(id);
    return this.prisma.club.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.club.delete({ where: { id } });
  }

  listPersonal(clubId: number) {
    return this.prisma.clubPersonal.findMany({
      where: { clubId },
      orderBy: { nombre: 'asc' },
    });
  }

  async addPersonal(clubId: number, dto: CreateClubPersonalDto) {
    await this.findOne(clubId);
    return this.prisma.clubPersonal.create({
      data: {
        clubId,
        tipo: dto.tipo,
        nombre: dto.nombre,
        dni: dto.dni?.trim() ? dto.dni.trim() : null,
        telefono: dto.telefono?.trim() ? dto.telefono.trim() : null,
      },
    });
  }

  async updatePersonal(
    clubId: number,
    personalId: number,
    dto: UpdateClubPersonalDto,
  ) {
    await this.findOne(clubId);
    const row = await this.prisma.clubPersonal.findFirst({
      where: { id: personalId, clubId },
    });
    if (!row) {
      throw new NotFoundException('Personal no encontrado en este club');
    }
    return this.prisma.clubPersonal.update({
      where: { id: personalId },
      data: {
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.dni !== undefined
          ? {
              dni:
                dto.dni === null || dto.dni === ''
                  ? null
                  : String(dto.dni).trim() || null,
            }
          : {}),
        ...(dto.telefono !== undefined
          ? {
              telefono:
                dto.telefono === null || dto.telefono === ''
                  ? null
                  : String(dto.telefono).trim() || null,
            }
          : {}),
      } as Prisma.ClubPersonalUpdateInput,
    });
  }

  async removePersonal(clubId: number, personalId: number) {
    await this.findOne(clubId);
    const row = await this.prisma.clubPersonal.findFirst({
      where: { id: personalId, clubId },
    });
    if (!row) {
      throw new NotFoundException('Personal no encontrado en este club');
    }
    await this.prisma.clubPersonal.delete({ where: { id: personalId } });
  }
}
