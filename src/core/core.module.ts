import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ValidacionService } from './validacion.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ValidacionService],
  exports: [ValidacionService],
})
export class CoreModule {}
