import { Module } from '@nestjs/common';
import {
  PartidosByTorneoController,
  PartidosResourceController,
} from './partidos.controller';
import { PartidosService } from './partidos.service';

@Module({
  controllers: [PartidosByTorneoController, PartidosResourceController],
  providers: [PartidosService],
})
export class PartidosModule {}
