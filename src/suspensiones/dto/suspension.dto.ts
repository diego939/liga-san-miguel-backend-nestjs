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

export class CreateSuspensionDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiProperty()
  @IsInt()
  torneoId: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  motivo: string;

  @ApiPropertyOptional({ default: 1, nullable: true })
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

export class UpdateSuspensionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiPropertyOptional()
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
