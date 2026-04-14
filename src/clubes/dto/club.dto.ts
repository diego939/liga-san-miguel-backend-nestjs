import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClubDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}

export class UpdateClubDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;
}

export class CreateClubPersonalDto {
  @ApiProperty({ example: 'DELEGADO' })
  @IsString()
  tipo: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Opcional' })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiPropertyOptional({ description: 'Opcional' })
  @IsOptional()
  @IsString()
  telefono?: string;
}

export class UpdateClubPersonalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Enviar null para borrar' })
  @IsOptional()
  @IsString()
  dni?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Enviar null para borrar' })
  @IsOptional()
  @IsString()
  telefono?: string | null;
}
