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
import { SuspensionQueryDto } from './dto/suspension-query.dto';
import { CreateSuspensionDto, UpdateSuspensionDto } from './dto/suspension.dto';
import { SuspensionesService } from './suspensiones.service';

@ApiTags('suspensiones')
@ApiBearerAuth('access-token')
@Controller('suspensiones')
export class SuspensionesController {
  constructor(private readonly suspensionesService: SuspensionesService) {}

  @Post()
  @ApiOperation({ summary: 'Alta manual de sanción' })
  create(@Body() dto: CreateSuspensionDto) {
    return this.suspensionesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar (filtros torneo/jugador/activas, paginación, orden)',
  })
  findAll(@Query() query: SuspensionQueryDto) {
    return this.suspensionesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suspensionesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar motivo o partidos restantes' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSuspensionDto,
  ) {
    return this.suspensionesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar registro' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suspensionesService.remove(id);
  }
}

@ApiTags('suspensiones')
@ApiBearerAuth('access-token')
@Controller('torneos/:torneoId/suspendidos')
export class SuspendidosPorTorneoController {
  constructor(private readonly suspensionesService: SuspensionesService) {}

  @Get()
  @ApiOperation({ summary: 'Suspendidos activos del torneo' })
  list(@Param('torneoId', ParseIntPipe) torneoId: number) {
    return this.suspensionesService.suspendidosPorTorneo(torneoId);
  }
}
