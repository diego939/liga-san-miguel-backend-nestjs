import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class RolQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Buscar en descripción' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['id', 'descripcion'], default: 'id' })
  @IsOptional()
  @IsIn(['id', 'descripcion'])
  sortBy?: 'id' | 'descripcion' = 'id';
}
