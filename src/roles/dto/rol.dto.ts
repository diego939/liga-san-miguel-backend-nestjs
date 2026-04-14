import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRolDto {
  @ApiProperty({ example: 'ADMIN' })
  @IsString()
  @MinLength(2)
  descripcion: string;
}

export class UpdateRolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  descripcion?: string;
}
