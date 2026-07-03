import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  GoalPriority,
  GoalStatus,
  GoalTargetType,
} from '../../../../generated/prisma/index.js';

export class CreateGoalDto {
  @ApiProperty({ example: 'Run a half marathon' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Sub-2-hour finish by the fall race.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 'flag', description: 'Material icon name.' })
  @IsString()
  @MaxLength(50)
  icon!: string;

  @ApiProperty({ example: '#3F51B5' })
  @IsString()
  @MaxLength(20)
  color!: string;

  @ApiPropertyOptional({ example: 'Health' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ enum: GoalPriority, default: GoalPriority.MEDIUM })
  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  @ApiPropertyOptional({
    enum: GoalStatus,
    default: GoalStatus.NOT_STARTED,
    description:
      'Archiving is a separate concept with its own endpoints (POST /goals/:id/archive, ' +
      '/unarchive) — this only covers the NOT_STARTED/ACTIVE/PAUSED/COMPLETED/CANCELLED lifecycle.',
  })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiProperty({
    enum: GoalTargetType,
    description:
      'What GET /goals/:id/progress recomputes currentValue from. CUSTOM has no automatic ' +
      'source — currentValue only changes via PATCH for CUSTOM goals.',
  })
  @IsEnum(GoalTargetType)
  targetType!: GoalTargetType;

  @ApiProperty({
    example: 10,
    minimum: 1,
    description:
      'The value currentValue must reach for 100% — count for TASK_COUNT/HABIT_COMPLETION/' +
      'ROUTINE_COMPLETION, minutes for FOCUS_TIME, whatever unit the goal owner defines for CUSTOM.',
  })
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  targetValue!: number;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description:
      'Starting value — only meaningful to set explicitly for CUSTOM goals; automatic target ' +
      'types get this recomputed from source data on the first GET /goals/:id/progress call.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  currentValue?: number;

  @ApiPropertyOptional({ example: '2026-07-03' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}
