import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPartido, Prisma, TipoEvento } from '@prisma/client';
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
      select: {
        equipoLocalId: true,
        equipoVisitanteId: true,
        golesLocal: true,
        golesVisitante: true,
      } satisfies Prisma.PartidoSelect,
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

  /**
   * Amarillas y rojas acumuladas por jugador en todos los partidos del torneo
   * (mismo criterio de alcance que goleadores: eventos ligados al torneo).
   */
  async tarjetasPorJugador(torneoId: number) {
    const torneo = await this.prisma.torneo.findUnique({
      where: { id: torneoId },
    });
    if (!torneo) {
      throw new NotFoundException('Torneo no encontrado');
    }

    const rows = await this.prisma.eventoPartido.groupBy({
      by: ['jugadorId', 'tipo'],
      where: {
        tipo: { in: [TipoEvento.AMARILLA, TipoEvento.ROJA] },
        partido: { torneoId },
      },
      _count: { id: true },
    });

    if (rows.length === 0) {
      return {
        totalAmarillas: 0,
        totalRojas: 0,
        jugadoresAmonestados: 0,
        jugadores: [],
      };
    }

    const agg = new Map<number, { amarillas: number; rojas: number }>();
    let totalAmarillas = 0;
    let totalRojas = 0;

    for (const r of rows) {
      let cur = agg.get(r.jugadorId);
      if (!cur) {
        cur = { amarillas: 0, rojas: 0 };
        agg.set(r.jugadorId, cur);
      }
      if (r.tipo === TipoEvento.AMARILLA) {
        cur.amarillas = r._count.id;
        totalAmarillas += r._count.id;
      } else if (r.tipo === TipoEvento.ROJA) {
        cur.rojas = r._count.id;
        totalRojas += r._count.id;
      }
    }

    const jugadorIds = [...agg.keys()];
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

    const jugadoresOut = [...agg.entries()]
      .map(([jugadorId, c]) => ({
        jugadorId,
        amarillas: c.amarillas,
        rojas: c.rojas,
        jugador: byId.get(jugadorId) ?? null,
        clubNombre: clubByJugador.get(jugadorId) ?? null,
      }))
      .sort((a, b) => {
        const ta = a.amarillas + a.rojas;
        const tb = b.amarillas + b.rojas;
        if (tb !== ta) return tb - ta;
        if (b.rojas !== a.rojas) return b.rojas - a.rojas;
        const na = a.jugador
          ? `${a.jugador.apellido}, ${a.jugador.nombre}`
          : `#${a.jugadorId}`;
        const nb = b.jugador
          ? `${b.jugador.apellido}, ${b.jugador.nombre}`
          : `#${b.jugadorId}`;
        return na.localeCompare(nb, 'es');
      });

    return {
      totalAmarillas,
      totalRojas,
      jugadoresAmonestados: jugadoresOut.length,
      jugadores: jugadoresOut,
    };
  }
}
