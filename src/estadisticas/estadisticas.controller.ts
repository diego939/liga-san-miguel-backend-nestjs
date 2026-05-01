import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstadisticasService } from './estadisticas.service';

@ApiTags('estadisticas')
@ApiBearerAuth('access-token')
@Controller('torneos/:torneoId')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('tabla-posiciones')
  @ApiOperation({ summary: 'Tabla desde partidos FINALIZADOS (3-1-0)' })
  tabla(@Param('torneoId', ParseIntPipe) torneoId: number) {
    return this.estadisticasService.tablaPosiciones(torneoId);
  }

  @Get('goleadores')
  @ApiOperation({ summary: 'Goles por jugador en el torneo (RN-11)' })
  goleadores(@Param('torneoId', ParseIntPipe) torneoId: number) {
    return this.estadisticasService.goleadores(torneoId);
  }

  @Get('tarjetas')
  @ApiOperation({
    summary:
      'Tarjetas amarillas y rojas acumuladas por jugador en el torneo (todos los partidos)',
  })
  tarjetas(@Param('torneoId', ParseIntPipe) torneoId: number) {
    return this.estadisticasService.tarjetasPorJugador(torneoId);
  }
}
