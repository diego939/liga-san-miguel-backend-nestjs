import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateInscripcionDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiProperty({
    //RN-07:
    description: 'Marca foráneo en la nómina',
  })
  @IsBoolean()
  esForaneo: boolean;
}

export class PreviewInscripcionQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  jugadorId: number;
}

/** Jugadores elegibles para inscribir (pase al club del equipo). */
export class CandidatosInscripcionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtro por DNI (contiene)' })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiPropertyOptional({ description: 'Nombre o apellido (contiene)' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class InscripcionBatchLineaDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  jugadorId: number;

  @ApiProperty({
    //RN-07:
    description: 'Foráneo en la nómina de este torneo',
  })
  @IsBoolean()
  esForaneo: boolean;
}

export class CreateInscripcionBatchDto {
  @ApiProperty({ type: [InscripcionBatchLineaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InscripcionBatchLineaDto)
  items: InscripcionBatchLineaDto[];
}

export class CerrarInscripcionesBatchDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];
}

export class InscripcionListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Solo inscripciones sin fecha de baja',
  })
  @IsOptional()
  @Transform(
    ({ value }) => value === true || value === 'true' || value === '1',
  )
  @IsBoolean()
  soloActivas?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar por nombre, apellido o DNI del jugador',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: ['apellido', 'nombre', 'dni', 'fechaInicio', 'id'],
    default: 'apellido',
  })
  @IsOptional()
  @IsIn(['apellido', 'nombre', 'dni', 'fechaInicio', 'id'])
  sortBy?: 'apellido' | 'nombre' | 'dni' | 'fechaInicio' | 'id' = 'apellido';
}
