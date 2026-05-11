import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPartido, TipoEvento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreatePartidoDto {
  @ApiProperty()
  @IsInt()
  equipoLocalId: number;

  @ApiProperty()
  @IsInt()
  equipoVisitanteId: number;

  @ApiProperty()
  @IsDateString()
  fecha: string;
}

export class UpdatePartidoDto {
  @ApiPropertyOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional()
  @IsInt()
  equipoLocalId?: number;

  @ApiPropertyOptional()
  @IsInt()
  equipoVisitanteId?: number;
}

export class UpdateEstadoPartidoDto {
  @ApiProperty({ enum: EstadoPartido })
  @IsEnum(EstadoPartido)
  estado: EstadoPartido;
}

export class UpdateMarcadorDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  golesLocal: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  golesVisitante: number;
}

export class PlanillaLineaDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiProperty()
  @IsBoolean()
  titular: boolean;

  @ApiPropertyOptional({
    description: 'Número de camiseta en la planilla del partido',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  numeroCamiseta?: number | null;
}

export class ReemplazarPlanillaDto {
  @ApiProperty({ type: [PlanillaLineaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanillaLineaDto)
  local: PlanillaLineaDto[];

  @ApiProperty({ type: [PlanillaLineaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanillaLineaDto)
  visitante: PlanillaLineaDto[];

  @ApiPropertyOptional({ nullable: true, description: 'Debe estar en planilla local' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capitanLocalJugadorId?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Debe estar en planilla visitante' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capitanVisitanteJugadorId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  arbitroPrincipal?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  juezLinea1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  juezLinea2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  observaciones?: string | null;
}

export class ConfigSuspensionEventoRojaDto {
  @ApiPropertyOptional({ nullable: true, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partidosRestantes?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Fecha límite (inclusive) hasta la que no puede jugar',
  })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

export class CreateEventoPartidoDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiProperty({ enum: TipoEvento })
  @IsEnum(TipoEvento)
  tipo: TipoEvento;

  @ApiProperty()
  @IsInt()
  @Min(0)
  minuto: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string | null;

  @ApiPropertyOptional({
    description:
      'Configuración de suspensión para ROJA (usar partidosRestantes o fechaHasta)',
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigSuspensionEventoRojaDto)
  suspensionRoja?: ConfigSuspensionEventoRojaDto;

  @ApiPropertyOptional({
    description:
      'Obligatorio cuando esta amarilla completa 5, 10, 15… amarillas en el torneo: definir suspensión por partidosRestantes o fechaHasta',
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigSuspensionEventoRojaDto)
  suspensionAcumulacionAmarillas?: ConfigSuspensionEventoRojaDto;
}

export class CreateCambioDto {
  @ApiProperty()
  @IsInt()
  jugadorSaleId: number;

  @ApiProperty()
  @IsInt()
  jugadorEntraId: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  minuto: number;
}

export class PartidoTorneoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoPartido })
  @IsOptional()
  @IsEnum(EstadoPartido)
  estado?: EstadoPartido;

  @ApiPropertyOptional({
    description: 'Buscar por nombre de club (local o visitante)',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['fecha', 'estado', 'id'], default: 'fecha' })
  @IsOptional()
  @IsIn(['fecha', 'estado', 'id'])
  sortBy?: 'fecha' | 'estado' | 'id' = 'fecha';
}

export class PreviewPlanillaQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  jugadorId: number;

  @ApiProperty({ description: 'Equipo (local o visitante) donde se alinearía' })
  @Type(() => Number)
  @IsInt()
  equipoTorneoId: number;
}
