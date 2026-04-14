import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class TorneoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Buscar en nombre, categoría o formato' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    enum: ['nombre', 'categoria', 'fechaInicio', 'fechaFin', 'id'],
    default: 'fechaInicio',
  })
  @IsOptional()
  @IsIn(['nombre', 'categoria', 'fechaInicio', 'fechaFin', 'id'])
  sortBy?: 'nombre' | 'categoria' | 'fechaInicio' | 'fechaFin' | 'id' =
    'fechaInicio';
}
