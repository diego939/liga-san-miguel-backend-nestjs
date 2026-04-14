import { Module } from '@nestjs/common';
import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';

@Module({
  controllers: [TorneosController],
  providers: [TorneosService],
  exports: [TorneosService],
})
export class TorneosModule {}
