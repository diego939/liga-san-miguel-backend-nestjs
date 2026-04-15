-- AlterEnum
ALTER TYPE "TipoEvento" ADD VALUE 'GOL_EN_CONTRA';

-- AlterTable
ALTER TABLE "Partido" ADD COLUMN     "capitanLocalJugadorId" INTEGER,
ADD COLUMN     "capitanVisitanteJugadorId" INTEGER,
ADD COLUMN     "arbitroPrincipal" TEXT,
ADD COLUMN     "juezLinea1" TEXT,
ADD COLUMN     "juezLinea2" TEXT,
ADD COLUMN     "observaciones" TEXT;

-- AlterTable
ALTER TABLE "PartidoJugador" ADD COLUMN     "numeroCamiseta" INTEGER;

-- AlterTable
ALTER TABLE "EventoPartido" ADD COLUMN     "notas" TEXT;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_capitanLocalJugadorId_fkey" FOREIGN KEY ("capitanLocalJugadorId") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_capitanVisitanteJugadorId_fkey" FOREIGN KEY ("capitanVisitanteJugadorId") REFERENCES "Jugador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_jugadorSaleId_fkey" FOREIGN KEY ("jugadorSaleId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_jugadorEntraId_fkey" FOREIGN KEY ("jugadorEntraId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
