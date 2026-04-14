import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTorneoDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty()
  @IsString()
  categoria: string;

  @ApiProperty({ description: 'Texto o código de formato deportivo' })
  @IsString()
  formato: string;

  @ApiProperty()
  @IsDateString()
  fechaInicio: string;

  @ApiProperty()
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({ description: 'Máx. foráneos por partido (RN-07)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limiteForaneos?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxJugadores: number;
}

export class UpdateTorneoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limiteForaneos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxJugadores?: number;
}
