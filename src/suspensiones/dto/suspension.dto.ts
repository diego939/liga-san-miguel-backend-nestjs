import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  partidosRestantes: number;
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
  @Min(0)
  partidosRestantes?: number;
}
