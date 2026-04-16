import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateCambioDto,
  CreateEventoPartidoDto,
  CreatePartidoDto,
  PartidoTorneoQueryDto,
  PreviewPlanillaQueryDto,
  ReemplazarPlanillaDto,
  UpdateEstadoPartidoDto,
  UpdateMarcadorDto,
  UpdatePartidoDto,
} from './dto/partido.dto';
import { PartidosService } from './partidos.service';

@ApiTags('partidos')
@ApiBearerAuth('access-token')
@Controller('torneos/:torneoId/partidos')
export class PartidosByTorneoController {
  constructor(private readonly partidosService: PartidosService) {}

  @Get()
  @ApiOperation({
    summary: 'Fixture del torneo (filtro estado, búsqueda club, paginación)',
  })
  list(
    @Param('torneoId', ParseIntPipe) torneoId: number,
    @Query() query: PartidoTorneoQueryDto,
  ) {
    return this.partidosService.listByTorneo(torneoId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Crear partido' })
  create(
    @Param('torneoId', ParseIntPipe) torneoId: number,
    @Body() dto: CreatePartidoDto,
  ) {
    return this.partidosService.create(torneoId, dto);
  }
}

@ApiTags('partidos')
@ApiBearerAuth('access-token')
@Controller('partidos')
export class PartidosResourceController {
  constructor(private readonly partidosService: PartidosService) {}

  @Get(':id/preview-jugador')
  @ApiOperation({
    summary: 'Validar jugador para planilla (pase, suspensión, inscripción)',
  })
  previewJugador(
    @Param('id', ParseIntPipe) partidoId: number,
    @Query() q: PreviewPlanillaQueryDto,
  ) {
    return this.partidosService.previewJugadorEnPlanilla(
      partidoId,
      q.jugadorId,
      q.equipoTorneoId,
    );
  }

  @Get(':id/planilla')
  @ApiOperation({ summary: 'Planilla cargada' })
  getPlanilla(@Param('id', ParseIntPipe) id: number) {
    return this.partidosService.listPlanilla(id);
  }

  @Put(':id/planilla')
  @ApiOperation({
    //RN-06, RN-07, RN-12:
    summary: 'Reemplazar planilla',
  })
  putPlanilla(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReemplazarPlanillaDto,
  ) {
    return this.partidosService.reemplazarPlanilla(id, dto);
  }

  @Get(':id/eventos')
  @ApiOperation({ summary: 'Eventos del partido' })
  listEventos(@Param('id', ParseIntPipe) id: number) {
    return this.partidosService.listEventos(id);
  }

  @Post(':id/eventos')
  @ApiOperation({
    //RN-08:
    summary: 'Registrar gol/tarjeta',
  })
  addEvento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEventoPartidoDto,
  ) {
    return this.partidosService.addEvento(id, dto);
  }

  @Delete(':id/eventos/:eventoId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar evento (solo partido EN_JUEGO)' })
  deleteEvento(
    @Param('id', ParseIntPipe) id: number,
    @Param('eventoId', ParseIntPipe) eventoId: number,
  ) {
    return this.partidosService.deleteEvento(id, eventoId);
  }

  @Get(':id/cambios')
  @ApiOperation({ summary: 'Cambios del partido' })
  listCambios(@Param('id', ParseIntPipe) id: number) {
    return this.partidosService.listCambios(id);
  }

  @Post(':id/cambios')
  @ApiOperation({ summary: 'Registrar sustitución' })
  addCambio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCambioDto,
  ) {
    return this.partidosService.addCambio(id, dto);
  }

  @Delete(':id/cambios/:cambioId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar sustitución (solo partido EN_JUEGO)' })
  deleteCambio(
    @Param('id', ParseIntPipe) id: number,
    @Param('cambioId', ParseIntPipe) cambioId: number,
  ) {
    return this.partidosService.deleteCambio(id, cambioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle partido' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partidosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar fecha/equipos (no finalizado)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePartidoDto) {
    return this.partidosService.update(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Cambiar estado (al FINALIZADO consume suspensiones)',
  })
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEstadoPartidoDto,
  ) {
    return this.partidosService.updateEstado(id, dto);
  }

  @Patch(':id/marcador')
  @ApiOperation({ summary: 'Actualizar marcador manual' })
  updateMarcador(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarcadorDto,
  ) {
    return this.partidosService.updateMarcador(id, dto);
  }
}
