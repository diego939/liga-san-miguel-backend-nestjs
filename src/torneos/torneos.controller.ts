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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TorneoQueryDto } from './dto/torneo-query.dto';
import { CreateTorneoDto, UpdateTorneoDto } from './dto/torneo.dto';
import { TorneosService } from './torneos.service';

@ApiTags('torneos')
@ApiBearerAuth('access-token')
@Controller('torneos')
export class TorneosController {
  constructor(private readonly torneosService: TorneosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear torneo' })
  create(@Body() dto: CreateTorneoDto) {
    return this.torneosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar torneos (búsqueda, orden, paginación)' })
  findAll(@Query() query: TorneoQueryDto) {
    return this.torneosService.findAll(query);
  }

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Resumen para UI (equipos, partidos por estado)' })
  resumen(@Param('id', ParseIntPipe) id: number) {
    return this.torneosService.resumen(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener torneo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.torneosService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar torneo / reglas' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTorneoDto) {
    return this.torneosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar torneo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.torneosService.remove(id);
  }
}
