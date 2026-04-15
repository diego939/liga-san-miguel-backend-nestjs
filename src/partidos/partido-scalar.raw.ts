import { EstadoPartido, Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/** Fila leída con SQL explícito (evita bug del cliente Prisma que referencia columna `existe`). */
export type PartidoScalarRow = {
  id: number;
  torneoId: number;
  equipoLocalId: number;
  equipoVisitanteId: number;
  fecha: Date;
  golesLocal: number;
  golesVisitante: number;
  estado: string;
  capitanLocalJugadorId: number | null;
  capitanVisitanteJugadorId: number | null;
  arbitroPrincipal: string | null;
  juezLinea1: string | null;
  juezLinea2: string | null;
  observaciones: string | null;
};

export function parseEstadoPartido(raw: string): EstadoPartido {
  if (raw === 'PENDIENTE' || raw === 'EN_JUEGO' || raw === 'FINALIZADO') {
    return raw;
  }
  return EstadoPartido.PENDIENTE;
}

/**
 * Lee escalares de `Partido` con SQL explícito.
 * Si la migración de acta/planilla no está aplicada, reintenta sin esas columnas (acta en null).
 */
export async function queryPartidoScalarsById(
  prisma: PrismaService,
  id: number,
): Promise<PartidoScalarRow | null> {
  const conActa = Prisma.sql`
    SELECT
      p.id,
      p."torneoId",
      p."equipoLocalId",
      p."equipoVisitanteId",
      p.fecha,
      p."golesLocal",
      p."golesVisitante",
      p.estado::text AS estado,
      p."capitanLocalJugadorId",
      p."capitanVisitanteJugadorId",
      p."arbitroPrincipal",
      p."juezLinea1",
      p."juezLinea2",
      p.observaciones
    FROM "Partido" p
    WHERE p.id = ${id}
    LIMIT 1
  `;

  const soloBase = Prisma.sql`
    SELECT
      p.id,
      p."torneoId",
      p."equipoLocalId",
      p."equipoVisitanteId",
      p.fecha,
      p."golesLocal",
      p."golesVisitante",
      p.estado::text AS estado,
      NULL::integer AS "capitanLocalJugadorId",
      NULL::integer AS "capitanVisitanteJugadorId",
      NULL::text AS "arbitroPrincipal",
      NULL::text AS "juezLinea1",
      NULL::text AS "juezLinea2",
      NULL::text AS observaciones
    FROM "Partido" p
    WHERE p.id = ${id}
    LIMIT 1
  `;

  try {
    const rows = await prisma.$queryRaw<PartidoScalarRow[]>(conActa);
    return rows[0] ?? null;
  } catch {
    const rows = await prisma.$queryRaw<PartidoScalarRow[]>(soloBase);
    return rows[0] ?? null;
  }
}
