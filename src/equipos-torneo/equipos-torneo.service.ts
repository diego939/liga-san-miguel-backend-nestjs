import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsociarClubDto } from './dto/equipo-torneo.dto';

@Injectable()
export class EquiposTorneoService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureTorneo(torneoId: number) {
    const t = await this.prisma.torneo.findUnique({ where: { id: torneoId } });
    if (!t) {
      throw new NotFoundException('Torneo no encontrado');
    }
    return t;
  }

  async listByTorneo(torneoId: number) {
    await this.ensureTorneo(torneoId);
    const equipos = await this.prisma.equipoTorneo.findMany({
      where: { torneoId },
      include: { club: true },
      orderBy: { id: 'asc' },
    });
    if (equipos.length === 0) {
      return [];
    }
    const counts = await this.prisma.inscripcion.groupBy({
      by: ['equipoTorneoId'],
      where: {
        equipoTorneoId: { in: equipos.map((e) => e.id) },
        fechaFin: null,
      },
      _count: { _all: true },
    });
    const byEq = new Map(
      counts.map((c) => [c.equipoTorneoId, c._count._all]),
    );
    return equipos.map((e) => ({
      ...e,
      jugadoresInscriptosActivos: byEq.get(e.id) ?? 0,
    }));
  }

  async asociarClub(torneoId: number, dto: AsociarClubDto) {
    await this.ensureTorneo(torneoId);
    const club = await this.prisma.club.findUnique({
      where: { id: dto.clubId },
    });
    if (!club) {
      throw new NotFoundException('Club no encontrado');
    }
    const exists = await this.prisma.equipoTorneo.findFirst({
      where: { torneoId, clubId: dto.clubId },
    });
    if (exists) {
      throw new ConflictException('El club ya está en este torneo');
    }
    return this.prisma.equipoTorneo.create({
      data: { torneoId, clubId: dto.clubId },
      include: { club: true, torneo: true },
    });
  }

  async findOne(equipoTorneoId: number) {
    const e = await this.prisma.equipoTorneo.findUnique({
      where: { id: equipoTorneoId },
      include: { club: true, torneo: true },
    });
    if (!e) {
      throw new NotFoundException('Equipo en torneo no encontrado');
    }
    return e;
  }

  async remove(equipoTorneoId: number) {
    await this.findOne(equipoTorneoId);
    await this.prisma.equipoTorneo.delete({ where: { id: equipoTorneoId } });
  }

  async resumenEquipo(equipoTorneoId: number) {
    const eq = await this.findOne(equipoTorneoId);
    const activas = await this.prisma.inscripcion.count({
      where: {
        equipoTorneoId,
        fechaFin: null,
      },
    });
    const foraneos = await this.prisma.inscripcion.count({
      where: {
        equipoTorneoId,
        fechaFin: null,
        esForaneo: true,
      },
    });
    return {
      equipo: eq,
      inscripcionesActivas: activas,
      foraneosActivos: foraneos,
      maxJugadores: eq.torneo.maxJugadores,
    };
  }
}
