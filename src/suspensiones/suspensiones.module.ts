import { Module } from '@nestjs/common';
import {
  SuspendidosPorTorneoController,
  SuspensionesController,
} from './suspensiones.controller';
import { SuspensionesService } from './suspensiones.service';

@Module({
  controllers: [SuspensionesController, SuspendidosPorTorneoController],
  providers: [SuspensionesService],
})
export class SuspensionesModule {}
