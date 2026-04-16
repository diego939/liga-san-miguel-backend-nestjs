import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClubActualResponseDto } from './dto/club-actual-response.dto';
import {
  CreateJugadorDto,
  JugadorQueryDto,
  UpdateJugadorDto,
} from './dto/jugador.dto';
import { JugadoresService } from './jugadores.service';

@ApiTags('jugadores')
@ApiBearerAuth('access-token')
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  @Post()
  @ApiOperation({
    //RN-01:
    summary: 'Crear jugador (DNI único)',
  })
  create(@Body() dto: CreateJugadorDto) {
    return this.jugadoresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar / buscar jugadores' })
  findAll(@Query() query: JugadorQueryDto) {
    return this.jugadoresService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener jugador' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar jugador' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJugadorDto) {
    return this.jugadoresService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar jugador' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.remove(id);
  }

  @Get(':id/club-actual')
  @ApiOperation({
    //RN-04:
    summary: 'Club elegible por pase activo (fecha opcional)',
  })
  @ApiOkResponse({ type: ClubActualResponseDto })
  clubActual(
    @Param('id', ParseIntPipe) id: number,
    @Query('fecha') fecha?: string,
  ): Promise<ClubActualResponseDto> {
    return this.jugadoresService.clubActual(id, fecha);
  }

  @Get(':id/pases')
  @ApiOperation({ summary: 'Historial de pases' })
  listPases(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.listPases(id);
  }

  @Get(':id/inscripciones')
  @ApiOperation({ summary: 'Inscripciones del jugador' })
  listInscripciones(
    @Param('id', ParseIntPipe) id: number,
    @Query('torneoId') torneoId?: string,
  ) {
    return this.jugadoresService.listInscripciones(
      id,
      torneoId ? parseInt(torneoId, 10) : undefined,
    );
  }

  @Get(':id/eventos')
  @ApiOperation({ summary: 'Eventos en partidos (goles/tarjetas)' })
  listEventos(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.listEventos(id);
  }

  @Get(':id/suspensiones')
  @ApiOperation({ summary: 'Suspensiones del jugador' })
  listSuspensiones(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.listSuspensiones(id);
  }

  @Get(':id/torneos-jugados')
  @ApiOperation({ summary: 'Torneos / inscripciones históricas' })
  listTorneosJugados(@Param('id', ParseIntPipe) id: number) {
    return this.jugadoresService.listTorneosJugados(id);
  }
}
