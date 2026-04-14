import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPartido, TipoEvento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Row = {
  equipoTorneoId: number;
  clubNombre: string;
  puntos: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dif: number;
};

@Injectable()
export class EstadisticasService {
  constructor(private readonly prisma: PrismaService) {}

  async tablaPosiciones(torneoId: number): Promise<Row[]> {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) {
      throw new NotFoundException('Torneo no encontrado');
    }

    const equipos = await this.prisma.equipoTorneo.findMany({
      where: { torneoId },
      include: { club: true },
    });
    const map = new Map<number, Row>();
    for (const e of equipos) {
      map.set(e.id, {
        equipoTorneoId: e.id,
        clubNombre: e.club.nombre,
        puntos: 0,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        dif: 0,
      });
    }

    const partidos = await this.prisma.partido.findMany({
      where: { torneoId, estado: EstadoPartido.FINALIZADO },
    });

    for (const p of partidos) {
      const local = map.get(p.equipoLocalId);
      const vis = map.get(p.equipoVisitanteId);
      if (!local || !vis) {
        continue;
      }
      local.pj += 1;
      vis.pj += 1;
      local.gf += p.golesLocal;
      local.gc += p.golesVisitante;
      vis.gf += p.golesVisitante;
      vis.gc += p.golesLocal;

      if (p.golesLocal > p.golesVisitante) {
        local.pg += 1;
        local.puntos += 3;
        vis.pp += 1;
      } else if (p.golesLocal < p.golesVisitante) {
        vis.pg += 1;
        vis.puntos += 3;
        local.pp += 1;
      } else {
        local.pe += 1;
        vis.pe += 1;
        local.puntos += 1;
        vis.puntos += 1;
      }
    }

    const rows = [...map.values()].map((r) => ({
      ...r,
      dif: r.gf - r.gc,
    }));
    return rows.sort(
      (a, b) =>
        b.puntos - a.puntos || b.dif - a.dif || b.gf - a.gf,
    );
  }

  async goleadores(torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) {
      throw new NotFoundException('Torneo no encontrado');
    }

    const rows = await this.prisma.eventoPartido.groupBy({
      by: ['jugadorId'],
      where: {
        tipo: TipoEvento.GOL,
        partido: { torneoId },
      },
      _count: { id: true },
    });

    if (rows.length === 0) {
      return [];
    }

    const jugadorIds = rows.map((r) => r.jugadorId);
    const jugadores = await this.prisma.jugador.findMany({
      where: { id: { in: jugadorIds } },
    });
    const byId = new Map(jugadores.map((j) => [j.id, j]));

    const inscripciones = await this.prisma.inscripcion.findMany({
      where: {
        jugadorId: { in: jugadorIds },
        fechaFin: null,
        equipoTorneo: { torneoId },
      },
      include: { equipoTorneo: { include: { club: true } } },
    });
    const clubByJugador = new Map<number, string>();
    for (const ins of inscripciones) {
      if (!clubByJugador.has(ins.jugadorId)) {
        clubByJugador.set(ins.jugadorId, ins.equipoTorneo.club.nombre);
      }
    }

    return rows
      .map((r) => ({
        jugadorId: r.jugadorId,
        goles: r._count.id,
        jugador: byId.get(r.jugadorId) ?? null,
        clubNombre: clubByJugador.get(r.jugadorId) ?? null,
      }))
      .sort((a, b) => b.goles - a.goles);
  }
}
