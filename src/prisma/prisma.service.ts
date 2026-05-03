import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    // En Vercel no bloquear el cold start: si la BD tarda o la red cuelga,
    // await $connect() impide responder rutas ligeras (/docs) hasta timeout.
    if (process.env.VERCEL === '1' || process.env.OPENAPI_EXPORT === '1') {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
