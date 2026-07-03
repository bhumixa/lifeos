import { ApiProperty } from '@nestjs/swagger';
import {
  GoalPriority,
  GoalStatus,
  GoalTargetType,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

export class GoalMilestoneResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() goalId!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true, example: '2026-08-15' }) dueDate!:
    string | null;
  @ApiProperty() completed!: boolean;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;
  @ApiProperty() order!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Swagger-only response shape — GoalsService builds this itself (like HabitResponseDto) because
 * `progressPercent` and the milestone-count fields aren't Prisma columns. */
export class GoalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty({ nullable: true }) category!: string | null;
  @ApiProperty({ enum: GoalPriority }) priority!: GoalPriority;
  @ApiProperty({ enum: GoalTargetType }) targetType!: GoalTargetType;
  @ApiProperty() targetValue!: number;
  @ApiProperty() currentValue!: number;
  @ApiProperty({
    description:
      'currentValue / targetValue, capped at 100. 0 when targetValue is 0.',
  })
  progressPercent!: number;
  @ApiProperty({ nullable: true, example: '2026-07-03' }) startDate!:
    string | null;
  @ApiProperty({ nullable: true, example: '2026-10-15' }) targetDate!:
    string | null;
  @ApiProperty({ enum: GoalStatus }) status!: GoalStatus;
  @ApiProperty() archived!: boolean;
  @ApiProperty({ type: [GoalMilestoneResponseDto] })
  milestones!: GoalMilestoneResponseDto[];
  @ApiProperty() milestonesCompletedCount!: number;
  @ApiProperty() milestonesTotalCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedGoalsResponseDto {
  @ApiProperty({ type: [GoalResponseDto] })
  data!: GoalResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** GET /goals/:id/progress's dedicated response — distinct from GoalResponseDto because this is
 * the one endpoint that actually recomputes+persists currentValue from source data (see the class
 * doc on Goal in prisma/schema.prisma); the plain Goal shape alone doesn't communicate that a
 * refresh just happened. */
export class GoalProgressResponseDto {
  @ApiProperty() goalId!: string;
  @ApiProperty({ enum: GoalTargetType }) targetType!: GoalTargetType;
  @ApiProperty() targetValue!: number;
  @ApiProperty() currentValue!: number;
  @ApiProperty() progressPercent!: number;
  @ApiProperty() remainingValue!: number;
  @ApiProperty() isComplete!: boolean;
}
