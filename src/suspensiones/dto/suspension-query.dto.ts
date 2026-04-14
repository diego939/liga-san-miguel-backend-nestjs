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
    description: 'Solo suspensiones con partidos por cumplir',
  })
  @IsOptional()
  @Transform(
    ({ value }) => value === true || value === 'true' || value === '1',
  )
  @IsBoolean()
  activas?: boolean;

  @ApiPropertyOptional({ enum: ['id', 'partidosRestantes'], default: 'id' })
  @IsOptional()
  @IsIn(['id', 'partidosRestantes'])
  sortBy?: 'id' | 'partidosRestantes' = 'id';
}
