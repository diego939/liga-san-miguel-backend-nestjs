import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CambioEquipoTorneoDto } from './dto/cambio-equipo.dto';
import {
  CandidatosInscripcionQueryDto,
  CerrarInscripcionesBatchDto,
  CreateInscripcionBatchDto,
  CreateInscripcionDto,
  InscripcionListQueryDto,
  PreviewInscripcionQueryDto,
} from './dto/inscripcion.dto';
import { InscripcionesService } from './inscripciones.service';

@ApiTags('inscripciones')
@ApiBearerAuth('access-token')
@Controller('equipos-torneo/:equipoTorneoId/inscripciones')
export class InscripcionesByEquipoController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Get('preview')
  @ApiOperation({ summary: 'Validación previa RN-05/RN-12' })
  preview(
    @Param('equipoTorneoId', ParseIntPipe) equipoTorneoId: number,
    @Query() q: PreviewInscripcionQueryDto,
  ) {
    let fechaRef: Date | undefined;
    const rawFecha = q.fechaReferencia?.trim();
    if (rawFecha) {
      const ms = Date.parse(rawFecha);
      if (Number.isNaN(ms)) {
        throw new BadRequestException('fechaReferencia inválida');
      }
      fechaRef = new Date(ms);
    }
    return this.inscripcionesService.preview(
      equipoTorneoId,
      q.jugadorId,
      fechaRef,
    );
  }

  @Get('candidatos')
  @ApiOperation({
    summary:
      'Jugadores con pase al club del equipo (elegibles para inscribir en LBF)',
  })
  listCandidatos(
    @Param('equipoTorneoId', ParseIntPipe) equipoTorneoId: number,
    @Query() query: CandidatosInscripcionQueryDto,
  ) {
    return this.inscripcionesService.listCandidatosInscripcion(
      equipoTorneoId,
      query,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lista de buena fe (búsqueda jugador, paginación, orden)',
  })
  list(
    @Param('equipoTorneoId', ParseIntPipe) equipoTorneoId: number,
    @Query() query: InscripcionListQueryDto,
  ) {
    return this.inscripcionesService.listByEquipo(equipoTorneoId, query);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Inscribir varios jugadores a la lista' })
  createBatch(
    @Param('equipoTorneoId', ParseIntPipe) equipoTorneoId: number,
    @Body() dto: CreateInscripcionBatchDto,
  ) {
    return this.inscripcionesService.createBatch(equipoTorneoId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Inscribir jugador' })
  create(
    @Param('equipoTorneoId', ParseIntPipe) equipoTorneoId: number,
    @Body() dto: CreateInscripcionDto,
  ) {
    return this.inscripcionesService.create(equipoTorneoId, dto);
  }
}

@ApiTags('inscripciones')
@ApiBearerAuth('access-token')
@Controller('torneos/:torneoId/cambio-equipo')
export class CambioEquipoController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post()
  @ApiOperation({
    //RN-09:
    summary: 'Cambio de equipo en el torneo (historial vía fechaFin)',
  })
  cambiar(
    @Param('torneoId', ParseIntPipe) torneoId: number,
    @Body() dto: CambioEquipoTorneoDto,
  ) {
    return this.inscripcionesService.cambiarEquipoEnTorneo(
      torneoId,
      dto.jugadorId,
      dto.equipoDestinoId,
      dto.esForaneo,
    );
  }
}

@ApiTags('inscripciones')
@ApiBearerAuth('access-token')
@Controller('inscripciones')
export class InscripcionResourceController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post('cerrar-batch')
  @ApiOperation({ summary: 'Baja masiva (fecha fin) en varias inscripciones' })
  cerrarBatch(@Body() dto: CerrarInscripcionesBatchDto) {
    return this.inscripcionesService.cerrarBatch(dto);
  }

  @Patch(':id/cerrar')
  @ApiOperation({ summary: 'Baja de la lista (fechaFin)' })
  cerrar(@Param('id', ParseIntPipe) id: number) {
    return this.inscripcionesService.cerrar(id);
  }
}
