import { ApiProperty } from '@nestjs/swagger';

export class StreakTotalsDto {
  @ApiProperty() tasksCompleted!: number;
  @ApiProperty() habitCompletions!: number;
  @ApiProperty() routineCompletions!: number;
  @ApiProperty() perfectDays!: number;
}

export class FreezeDaysSummaryDto {
  @ApiProperty() usedThisMonth!: number;
  @ApiProperty() remainingThisMonth!: number;
  @ApiProperty() monthlyQuota!: number;
}

/** One cell for the Weekly/Monthly Heatmap — mirrors the shape
 * features/habits/utils/habit-display.ts's HeatmapCell already establishes on the frontend
 * (`completedCount`/`totalCount` instead of `completedCount`/`targetCount`, since this is a rollup
 * across every active daily habit rather than one habit's own count), so the same
 * `heatmapLevel()` helper can grade both. */
export class DailyHistoryEntryDto {
  @ApiProperty({ example: '2026-07-03' }) date!: string;
  @ApiProperty() completedCount!: number;
  @ApiProperty() totalCount!: number;
  @ApiProperty() successful!: boolean;
}

export class StreaksStatisticsResponseDto {
  @ApiProperty() hasDailyHabits!: boolean;
  @ApiProperty() currentStreak!: number;
  @ApiProperty() longestStreak!: number;
  @ApiProperty({
    description:
      'Percent of the trailing 7 days (including today) that were successful.',
  })
  weeklyConsistency!: number;
  @ApiProperty({
    description:
      'Percent of the trailing 30 days (including today) that were successful.',
  })
  monthlyConsistency!: number;
  @ApiProperty({
    description:
      'Percent of days successful since the earliest active daily habit was created (bounded lookback).',
  })
  successRate!: number;
  @ApiProperty() isPerfectWeek!: boolean;
  @ApiProperty() isPerfectMonth!: boolean;
  @ApiProperty() xpEarned!: number;
  @ApiProperty({ type: StreakTotalsDto })
  totals!: StreakTotalsDto;
  @ApiProperty({ type: FreezeDaysSummaryDto })
  freezeDays!: FreezeDaysSummaryDto;
  @ApiProperty({
    type: [DailyHistoryEntryDto],
    description:
      'Trailing daily history (bounded lookback window) powering the Weekly/Monthly Heatmap.',
  })
  dailyHistory!: DailyHistoryEntryDto[];
}
