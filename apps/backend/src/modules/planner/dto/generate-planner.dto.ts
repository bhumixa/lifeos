import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-planner-block.dto.js';

export class GeneratePlannerDto {
  @ApiPropertyOptional({
    example: '2026-07-03',
    description:
      '"YYYY-MM-DD"; defaults to today in the user\'s timezone when omitted.',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'date must be in "YYYY-MM-DD" format',
  })
  date?: string;

  @ApiPropertyOptional({
    default: 10,
    minimum: 0,
    maximum: 120,
    description: 'Minutes of buffer left between generated blocks.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferMinutes?: number;
}
