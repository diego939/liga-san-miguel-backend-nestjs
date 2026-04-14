import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ClubQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre de club' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['nombre', 'id'], default: 'nombre' })
  @IsOptional()
  @IsIn(['nombre', 'id'])
  sortBy?: 'nombre' | 'id' = 'nombre';
}
