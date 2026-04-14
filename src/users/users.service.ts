import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { normalizePage } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioQueryDto } from './dto/usuario-query.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmailWithPassword(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        rolId: true,
        rol: true,
      },
    });
  }

  findById(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, email: true, rolId: true, rol: true },
    });
  }

  async create(dto: CreateUsuarioDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.usuario.create({
        data: {
          email: dto.email,
          password: hash,
          rolId: dto.rolId,
        },
        select: { id: true, email: true, rolId: true, rol: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado');
      }
      throw e;
    }
  }

  async findAll(query: UsuarioQueryDto) {
    const { page, limit, skip } = normalizePage(query.page, query.limit);
    const where: Prisma.UsuarioWhereInput = query.q
      ? {
          email: { contains: query.q, mode: 'insensitive' },
        }
      : {};
    const sortField = query.sortBy ?? 'email';
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.UsuarioOrderByWithRelationInput = {
      [sortField]: order,
    };
    const [items, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: { id: true, email: true, rolId: true, rol: true },
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    await this.ensureExists(id);
    const data: Prisma.UsuarioUpdateInput = {};
    if (dto.email !== undefined) {
      data.email = dto.email;
    }
    if (dto.rolId !== undefined) {
      data.rol = { connect: { id: dto.rolId } };
    }
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    try {
      return await this.prisma.usuario.update({
        where: { id },
        data,
        select: { id: true, email: true, rolId: true, rol: true },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.usuario.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
