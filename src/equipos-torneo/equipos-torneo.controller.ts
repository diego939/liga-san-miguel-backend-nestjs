import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AsociarClubDto } from './dto/equipo-torneo.dto';
import { EquiposTorneoService } from './equipos-torneo.service';

@ApiTags('equipos-torneo')
@ApiBearerAuth('access-token')
@Controller('torneos/:torneoId/equipos')
export class EquiposTorneoByTorneoController {
  constructor(private readonly equiposTorneoService: EquiposTorneoService) {}

  @Get()
  @ApiOperation({ summary: 'Equipos participantes del torneo' })
  list(@Param('torneoId', ParseIntPipe) torneoId: number) {
    return this.equiposTorneoService.listByTorneo(torneoId);
  }

  @Post()
  @ApiOperation({ summary: 'Asociar club al torneo' })
  asociar(
    @Param('torneoId', ParseIntPipe) torneoId: number,
    @Body() dto: AsociarClubDto,
  ) {
    return this.equiposTorneoService.asociarClub(torneoId, dto);
  }
}

@ApiTags('equipos-torneo')
@ApiBearerAuth('access-token')
@Controller('equipos-torneo')
export class EquipoTorneoResourceController {
  constructor(private readonly equiposTorneoService: EquiposTorneoService) {}

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Cupos / foráneos inscriptos (torneo)' })
  resumen(@Param('id', ParseIntPipe) id: number) {
    return this.equiposTorneoService.resumenEquipo(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle equipo en torneo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposTorneoService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Quitar club del torneo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposTorneoService.remove(id);
  }
}
