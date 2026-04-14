import { Module } from '@nestjs/common';
import {
  CambioEquipoController,
  InscripcionResourceController,
  InscripcionesByEquipoController,
} from './inscripciones.controller';
import { InscripcionesService } from './inscripciones.service';

@Module({
  controllers: [
    InscripcionesByEquipoController,
    CambioEquipoController,
    InscripcionResourceController,
  ],
  providers: [InscripcionesService],
})
export class InscripcionesModule {}
