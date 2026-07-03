import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DeleteHabitLogQueryDto {
  @ApiPropertyOptional({
    example: '2026-07-03',
    description:
      'Date of the log to delete ("YYYY-MM-DD"). Defaults to today when omitted.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
