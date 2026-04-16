import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClubActualResponseDto {
  @ApiPropertyOptional({
    //RN-03/RN-04:
    description: 'Club elegible según pases',
  })
  clubId: number | null;

  @ApiPropertyOptional()
  clubNombre?: string | null;

  @ApiProperty()
  fechaReferencia: string;
}
