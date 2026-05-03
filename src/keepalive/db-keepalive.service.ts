import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const KEEPALIVE_INTERVAL_MINUTES = 600;

@Injectable()
export class DbKeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbKeepAliveService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastOkAt: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (process.env.VERCEL === '1' || process.env.OPENAPI_EXPORT === '1') {
      this.logger.log(
        'Keepalive desactivado (serverless o export OpenAPI; sin ping ni intervalo)',
      );
      return;
    }

    void this.ping('startup');

    const intervalMs = KEEPALIVE_INTERVAL_MINUTES * 60_000;
    this.timer = setInterval(() => {
      void this.ping('cron');
    }, intervalMs);

    this.logger.log(
      `Keepalive de BD activo cada ${KEEPALIVE_INTERVAL_MINUTES} minuto(s)`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async ping(source: 'startup' | 'cron' | 'endpoint' = 'endpoint') {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      this.lastOkAt = new Date();
      this.logger.log(
        `Keepalive OK (${source}) - ${this.lastOkAt.toISOString()}`,
      );
      return {
        ok: true,
        source,
        at: this.lastOkAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Falló keepalive de BD (${source})`, error);
      return {
        ok: false,
        source,
        at: new Date().toISOString(),
      };
    }
  }

  getLastOkAtIso(): string | null {
    return this.lastOkAt ? this.lastOkAt.toISOString() : null;
  }
}
