import { ApiProperty } from '@nestjs/swagger';
import { HabitFrequency } from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

/** Swagger-only response shape — HabitsService builds this itself (unlike TaskResponseDto,
 * which mirrors the Prisma type directly) because completionPercent/currentPeriodCount/
 * completedToday are computed from HabitLog, not columns on Habit. */
export class HabitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() icon!: string;
  @ApiProperty() color!: string;
  @ApiProperty({ enum: HabitFrequency }) targetFrequency!: HabitFrequency;
  @ApiProperty() targetCount!: number;
  @ApiProperty({ nullable: true }) category!: string | null;
  @ApiProperty({ nullable: true }) reminderTime!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() currentPeriodCount!: number;
  @ApiProperty() completionPercent!: number;
  @ApiProperty() todayCount!: number;
  @ApiProperty() completedToday!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedHabitsResponseDto {
  @ApiProperty({ type: [HabitResponseDto] })
  data!: HabitResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class HabitLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() habitId!: string;
  @ApiProperty() date!: Date;
  @ApiProperty() completedCount!: number;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedHabitLogsResponseDto {
  @ApiProperty({ type: [HabitLogResponseDto] })
  data!: HabitLogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class HabitSummaryResponseDto {
  @ApiProperty() habitsCompletedToday!: number;
  @ApiProperty() totalActiveHabits!: number;
  @ApiProperty() completionPercentage!: number;
}
