import { Prisma } from '@prisma/client';

/** Jugador en respuestas de planilla / eventos / cambios. */
export const jugadorPlanillaSelect = {
  id: true,
  dni: true,
  nombre: true,
  apellido: true,
  telefono: true,
  fechaNacimiento: true,
  createdAt: true,
} satisfies Prisma.JugadorSelect;

const equipoTorneoConClub = {
  select: {
    id: true,
    torneoId: true,
    clubId: true,
    club: {
      select: { id: true, nombre: true, logo: true },
    },
  },
} satisfies Prisma.EquipoTorneoDefaultArgs;

/** listPlanilla / reemplazarPlanilla (respuesta). */
export const partidoJugadorListaSelect = {
  id: true,
  partidoId: true,
  jugadorId: true,
  equipoId: true,
  titular: true,
  numeroCamiseta: true,
  jugador: { select: jugadorPlanillaSelect },
  equipo: equipoTorneoConClub,
} satisfies Prisma.PartidoJugadorSelect;

/** listEventos / addEvento (respuesta con jugador). */
export const eventoPartidoConJugadorSelect = {
  id: true,
  partidoId: true,
  jugadorId: true,
  tipo: true,
  minuto: true,
  notas: true,
  jugador: { select: jugadorPlanillaSelect },
} satisfies Prisma.EventoPartidoSelect;

/** listCambios. */
export const cambioConJugadoresSelect = {
  id: true,
  partidoId: true,
  jugadorSaleId: true,
  jugadorEntraId: true,
  minuto: true,
  jugadorSale: { select: jugadorPlanillaSelect },
  jugadorEntra: { select: jugadorPlanillaSelect },
} satisfies Prisma.CambioSelect;

/** findFirst planilla: solo validar presencia y equipo. */
export const partidoJugadorCambioFindSelect = {
  id: true,
  equipoId: true,
} satisfies Prisma.PartidoJugadorSelect;
