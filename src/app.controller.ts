import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { DbKeepAliveService } from './keepalive/db-keepalive.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly keepAlive: DbKeepAliveService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Estado del servicio' })
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/db')
  @ApiOperation({
    summary:
      'Ping de base de datos (útil para cron keepalive en Supabase free)',
  })
  async dbHealth() {
    const result = await this.keepAlive.ping('endpoint');
    if (!result.ok) {
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'down',
        at: result.at,
        lastOkAt: this.keepAlive.getLastOkAtIso(),
      });
    }

    return {
      status: 'ok',
      db: 'up',
      at: result.at,
      lastOkAt: this.keepAlive.getLastOkAtIso(),
    };
  }
}
