import { Module } from '@nestjs/common';
import { JugadoresController } from './jugadores.controller';
import { JugadoresService } from './jugadores.service';

@Module({
  controllers: [JugadoresController],
  providers: [JugadoresService],
  exports: [JugadoresService],
})
export class JugadoresModule {}
