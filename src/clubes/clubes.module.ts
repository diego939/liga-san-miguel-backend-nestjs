import { Module } from '@nestjs/common';
import { ClubesController } from './clubes.controller';
import { ClubesService } from './clubes.service';

@Module({
  controllers: [ClubesController],
  providers: [ClubesService],
})
export class ClubesModule {}
