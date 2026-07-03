import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHabitLogDto {
  @ApiPropertyOptional({
    example: '2026-07-03',
    description:
      'Date to log ("YYYY-MM-DD"). Defaults to today (server date) when omitted.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  completedCount?: number;

  @ApiPropertyOptional({ example: 'Felt great after the morning walk.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
