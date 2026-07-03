import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGoalMilestoneDto {
  @ApiProperty({ example: 'Complete a 10k training run' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Under 55 minutes, flat course.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'Manual sort position; appended to the end when omitted.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  order?: number;
}
