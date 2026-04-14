import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AsociarClubDto {
  @ApiProperty()
  @IsInt()
  clubId: number;
}
