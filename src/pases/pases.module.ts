import { Module } from '@nestjs/common';
import { PasesController } from './pases.controller';
import { PasesService } from './pases.service';

@Module({
  controllers: [PasesController],
  providers: [PasesService],
})
export class PasesModule {}
