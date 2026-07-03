import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlannerBlockType } from '../../../../generated/prisma/index.js';

// Same "YYYY-MM-DD" convention as HabitLog/PlannerDay.date.
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePlannerBlockDto {
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

  @ApiProperty({ enum: PlannerBlockType })
  @IsEnum(PlannerBlockType)
  type!: PlannerBlockType;

  @ApiPropertyOptional({
    description:
      'Task.id / RoutineStep.id / Habit.id depending on `type`; omit for FOCUS/BREAK/CUSTOM.',
  })
  @IsOptional()
  @IsUUID('4')
  referenceId?: string;

  @ApiProperty({ example: 'Deep work: Q3 roadmap' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2026-07-03T09:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-07-03T10:00:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ example: '#3F51B5' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      'Manual sort position; appended to the end of the day when omitted.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  order?: number;

  @ApiPropertyOptional({
    description:
      'Milestone 9: optional Goal this block directly contributes to (must belong to the same ' +
      'user) — independent of `type`/`referenceId`; powers FOCUS_TIME progress.',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;
}
