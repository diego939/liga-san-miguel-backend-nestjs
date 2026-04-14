import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClubActualResponseDto {
  @ApiPropertyOptional({
    description: 'Club elegible según pases (RN-03/RN-04)',
  })
  clubId: number | null;

  @ApiPropertyOptional()
  clubNombre?: string | null;

  @ApiProperty()
  fechaReferencia: string;
}
