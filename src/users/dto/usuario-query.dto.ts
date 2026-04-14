import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class UsuarioQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Buscar por email (contiene)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['email', 'id', 'rolId'], default: 'email' })
  @IsOptional()
  @IsIn(['email', 'id', 'rolId'])
  sortBy?: 'email' | 'id' | 'rolId' = 'email';
}
