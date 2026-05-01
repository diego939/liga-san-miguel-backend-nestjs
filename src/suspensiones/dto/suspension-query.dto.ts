import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SuspensionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  torneoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jugadorId?: number;

  @ApiPropertyOptional({
    description:
      'Solo suspensiones activas por partidos pendientes o por fecha de bloqueo vigente',
  })
  @IsOptional()
  @Transform(
    ({ value }) => value === true || value === 'true' || value === '1',
  )
  @IsBoolean()
  activas?: boolean;

  @ApiPropertyOptional({
    enum: ['id', 'partidosRestantes', 'fechaHasta'],
    default: 'id',
  })
  @IsOptional()
  @IsIn(['id', 'partidosRestantes', 'fechaHasta'])
  sortBy?: 'id' | 'partidosRestantes' | 'fechaHasta' = 'id';
}
