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
import { ClubesService } from './clubes.service';
import { ClubQueryDto } from './dto/club-query.dto';
import {
  CreateClubDto,
  CreateClubPersonalDto,
  UpdateClubDto,
  UpdateClubPersonalDto,
} from './dto/club.dto';

@ApiTags('clubes')
@ApiBearerAuth('access-token')
@Controller('clubes')
export class ClubesController {
  constructor(private readonly clubesService: ClubesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear club' })
  create(@Body() dto: CreateClubDto) {
    return this.clubesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clubes (búsqueda, orden, paginación)' })
  findAll(@Query() query: ClubQueryDto) {
    return this.clubesService.findAll(query);
  }

  @Get(':id/personal')
  @ApiOperation({ summary: 'Personal del club' })
  listPersonal(@Param('id', ParseIntPipe) id: number) {
    return this.clubesService.listPersonal(id);
  }

  @Post(':id/personal')
  @ApiOperation({ summary: 'Agregar personal' })
  addPersonal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClubPersonalDto,
  ) {
    return this.clubesService.addPersonal(id, dto);
  }

  @Patch(':id/personal/:personalId')
  @ApiOperation({ summary: 'Editar personal' })
  updatePersonal(
    @Param('id', ParseIntPipe) id: number,
    @Param('personalId', ParseIntPipe) personalId: number,
    @Body() dto: UpdateClubPersonalDto,
  ) {
    return this.clubesService.updatePersonal(id, personalId, dto);
  }

  @Delete(':id/personal/:personalId')
  @ApiOperation({ summary: 'Eliminar personal' })
  removePersonal(
    @Param('id', ParseIntPipe) id: number,
    @Param('personalId', ParseIntPipe) personalId: number,
  ) {
    return this.clubesService.removePersonal(id, personalId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener club' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clubesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar club' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClubDto) {
    return this.clubesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar club' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clubesService.remove(id);
  }
}
