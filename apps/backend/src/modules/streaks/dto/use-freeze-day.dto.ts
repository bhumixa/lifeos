import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UseFreezeDayDto {
  @ApiPropertyOptional({
    example: '2026-07-02',
    description:
      'The date to protect ("YYYY-MM-DD"); defaults to today in the user\'s timezone. Must not be in the future.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
