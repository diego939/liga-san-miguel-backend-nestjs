import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPase } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreatePaseDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null u omitido para alta inicial (primer club del jugador).',
  })
  @IsOptional()
  @IsInt()
  clubOrigenId?: number | null;

  @ApiProperty()
  @IsInt()
  clubDestinoId: number;

  @ApiProperty({ enum: TipoPase })
  @IsEnum(TipoPase)
  tipo: TipoPase;

  @ApiProperty()
  @IsDateString()
  fechaInicio: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreatePaseDto) => o.tipo === TipoPase.TEMPORAL)
  @IsDateString()
  fechaFin?: string;
}

export class UpdatePaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ enum: TipoPase })
  @IsOptional()
  @IsEnum(TipoPase)
  tipo?: TipoPase;
}

export class PaseQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jugadorId?: number;

  @ApiPropertyOptional({
    description: 'Filtra pases donde origen o destino sea este club',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clubId?: number;

  @ApiPropertyOptional({
    enum: ['activo', 'vencido', 'todos'],
    default: 'todos',
    description: 'Estado del pase en fechaReferencia (por defecto: ahora)',
  })
  @IsOptional()
  @IsIn(['activo', 'vencido', 'todos'])
  estado?: 'activo' | 'vencido' | 'todos' = 'todos';

  @ApiPropertyOptional({
    description: 'Fecha de referencia para activo/vencido (ISO)',
  })
  @IsOptional()
  @IsDateString()
  fechaReferencia?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre/apellido del jugador' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: ['fechaInicio', 'fechaFin', 'id'],
    default: 'fechaInicio',
  })
  @IsOptional()
  @IsIn(['fechaInicio', 'fechaFin', 'id'])
  sortBy?: 'fechaInicio' | 'fechaFin' | 'id' = 'fechaInicio';
}

export class RenovarPaseDto {
  @ApiProperty({ description: 'Inicio del nuevo pase' })
  @IsDateString()
  fechaInicio: string;

  @ApiPropertyOptional({
    description: 'Obligatorio si el tipo es TEMPORAL',
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ enum: TipoPase })
  @IsOptional()
  @IsEnum(TipoPase)
  tipo?: TipoPase;
}
