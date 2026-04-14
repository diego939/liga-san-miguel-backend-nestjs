-- CreateEnum
CREATE TYPE "TipoPase" AS ENUM ('TEMPORAL', 'DEFINITIVO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('GOL', 'AMARILLA', 'ROJA');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('PENDIENTE', 'EN_JUEGO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rolId" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "logo" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubPersonal" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ClubPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pase" (
    "id" SERIAL NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "clubOrigenId" INTEGER NOT NULL,
    "clubDestinoId" INTEGER NOT NULL,
    "tipo" "TipoPase" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "Pase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "limiteForaneos" INTEGER,
    "maxJugadores" INTEGER NOT NULL,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipoTorneo" (
    "id" SERIAL NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,

    CONSTRAINT "EquipoTorneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "equipoTorneoId" INTEGER NOT NULL,
    "esForaneo" BOOLEAN NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partido" (
    "id" SERIAL NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "equipoLocalId" INTEGER NOT NULL,
    "equipoVisitanteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "golesLocal" INTEGER NOT NULL DEFAULT 0,
    "golesVisitante" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidoJugador" (
    "id" SERIAL NOT NULL,
    "partidoId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "equipoId" INTEGER NOT NULL,
    "titular" BOOLEAN NOT NULL,

    CONSTRAINT "PartidoJugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoPartido" (
    "id" SERIAL NOT NULL,
    "partidoId" INTEGER NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "minuto" INTEGER NOT NULL,

    CONSTRAINT "EventoPartido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cambio" (
    "id" SERIAL NOT NULL,
    "partidoId" INTEGER NOT NULL,
    "jugadorSaleId" INTEGER NOT NULL,
    "jugadorEntraId" INTEGER NOT NULL,
    "minuto" INTEGER NOT NULL,

    CONSTRAINT "Cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suspension" (
    "id" SERIAL NOT NULL,
    "jugadorId" INTEGER NOT NULL,
    "torneoId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "partidosRestantes" INTEGER NOT NULL,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_dni_key" ON "Jugador"("dni");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubPersonal" ADD CONSTRAINT "ClubPersonal_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pase" ADD CONSTRAINT "Pase_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pase" ADD CONSTRAINT "Pase_clubOrigenId_fkey" FOREIGN KEY ("clubOrigenId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pase" ADD CONSTRAINT "Pase_clubDestinoId_fkey" FOREIGN KEY ("clubDestinoId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipoTorneo" ADD CONSTRAINT "EquipoTorneo_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipoTorneo" ADD CONSTRAINT "EquipoTorneo_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_equipoTorneoId_fkey" FOREIGN KEY ("equipoTorneoId") REFERENCES "EquipoTorneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_equipoLocalId_fkey" FOREIGN KEY ("equipoLocalId") REFERENCES "EquipoTorneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partido" ADD CONSTRAINT "Partido_equipoVisitanteId_fkey" FOREIGN KEY ("equipoVisitanteId") REFERENCES "EquipoTorneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoJugador" ADD CONSTRAINT "PartidoJugador_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoJugador" ADD CONSTRAINT "PartidoJugador_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidoJugador" ADD CONSTRAINT "PartidoJugador_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "EquipoTorneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPartido" ADD CONSTRAINT "EventoPartido_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_jugadorId_fkey" FOREIGN KEY ("jugadorId") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
