import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  rolId: number;

  /** Texto del rol (`Rol.descripcion`, p. ej. ADMIN, OPERADOR). */
  @ApiProperty()
  rolDescripcion: string;
}

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
