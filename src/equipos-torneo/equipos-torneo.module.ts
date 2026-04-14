import { Module } from '@nestjs/common';
import {
  EquipoTorneoResourceController,
  EquiposTorneoByTorneoController,
} from './equipos-torneo.controller';
import { EquiposTorneoService } from './equipos-torneo.service';

@Module({
  controllers: [
    EquiposTorneoByTorneoController,
    EquipoTorneoResourceController,
  ],
  providers: [EquiposTorneoService],
  exports: [EquiposTorneoService],
})
export class EquiposTorneoModule {}
