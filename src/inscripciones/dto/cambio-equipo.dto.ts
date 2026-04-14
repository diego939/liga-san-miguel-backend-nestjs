import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt } from 'class-validator';

export class CambioEquipoTorneoDto {
  @ApiProperty()
  @IsInt()
  jugadorId: number;

  @ApiProperty()
  @IsInt()
  equipoDestinoId: number;

  @ApiProperty()
  @IsBoolean()
  esForaneo: boolean;
}
