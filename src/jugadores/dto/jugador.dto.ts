import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateJugadorDto {
  @ApiProperty({ example: '30123456' })
  @IsString()
  @MinLength(6)
  dni: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  nombre: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  apellido: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 2000, description: 'Año de nacimiento (obligatorio).' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  anioNacimiento: number;

  @ApiPropertyOptional({
    example: '2000-01-15',
    description: 'Fecha completa opcional si se conoce.',
  })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nacionalidad?: string | null;

  @ApiPropertyOptional({
    description:
      'Si se envía, se registra un pase inicial DEFINITIVO (origen null → destino este club).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clubDestinoInicialId?: number;
}

export class UpdateJugadorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  dni?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Año de nacimiento.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2200)
  anioNacimiento?: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Fecha de nacimiento. En PATCH, omitir para no cambiar; null o string vacío para borrar.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsDateString()
  fechaNacimiento?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Nacionalidad del jugador. En PATCH, enviar null o string vacío para limpiar el dato.',
  })
  @IsOptional()
  @IsString()
  nacionalidad?: string | null;
}

export class JugadorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca en nombre o apellido' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtro por DNI (contiene)' })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiPropertyOptional({
    enum: [
      'apellido',
      'nombre',
      'dni',
      'anioNacimiento',
      'fechaNacimiento',
      'createdAt',
    ],
    default: 'apellido',
  })
  @IsOptional()
  @IsIn([
    'apellido',
    'nombre',
    'dni',
    'anioNacimiento',
    'fechaNacimiento',
    'createdAt',
  ])
  sortBy?:
    | 'apellido'
    | 'nombre'
    | 'dni'
    | 'anioNacimiento'
    | 'fechaNacimiento'
    | 'createdAt' = 'apellido';
}
