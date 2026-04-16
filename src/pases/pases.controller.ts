import {
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
import {
  CreatePaseDto,
  PaseQueryDto,
  RenovarPaseDto,
  UpdatePaseDto,
} from './dto/pase.dto';
import { PasesService } from './pases.service';

@ApiTags('pases')
@ApiBearerAuth('access-token')
@Controller('pases')
export class PasesController {
  constructor(private readonly pasesService: PasesService) {}

  @Post()
  @ApiOperation({
    //RN-02:
    summary: 'Registrar pase (cierra pase activo previo)',
  })
  create(@Body() dto: CreatePaseDto) {
    return this.pasesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pases (filtros opcionales)' })
  findAll(@Query() query: PaseQueryDto) {
    return this.pasesService.findAll(query);
  }

  @Post(':id/renovar')
  @ApiOperation({
    summary: 'Renovar pase (cierra vigentes y crea uno nuevo con las mismas sedes)',
  })
  renovar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenovarPaseDto,
  ) {
    return this.pasesService.renovar(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de pase' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pasesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corregir fechas/tipo' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaseDto) {
    return this.pasesService.update(id, dto);
  }
}
