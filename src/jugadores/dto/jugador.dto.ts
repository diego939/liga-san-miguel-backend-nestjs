import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
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

  @ApiProperty({ example: '2000-01-15' })
  @IsDateString()
  fechaNacimiento: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;
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
    enum: ['apellido', 'nombre', 'dni', 'fechaNacimiento', 'createdAt'],
    default: 'apellido',
  })
  @IsOptional()
  @IsIn(['apellido', 'nombre', 'dni', 'fechaNacimiento', 'createdAt'])
  sortBy?: 'apellido' | 'nombre' | 'dni' | 'fechaNacimiento' | 'createdAt' =
    'apellido';
}
