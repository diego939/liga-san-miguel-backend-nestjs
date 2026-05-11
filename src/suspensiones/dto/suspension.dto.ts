import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    description:
      'Partidos restantes (≥1) o 0 para revocar vigencia (sin partidos ni fecha)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  partidosRestantes?: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Fecha límite (inclusive) hasta la que no puede jugar',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  fechaHasta?: string | null;
}
