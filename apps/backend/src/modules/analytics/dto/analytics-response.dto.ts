import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsPeriod } from '../../../../generated/prisma/index.js';

/** One point on any domain chart. Meaning of `value`/`total` is documented per response DTO below
 * (e.g. Tasks: value=completed, total=due; Journal: value=average mood score, total=entry count;
 * Calendar: value=event count, no total) — a single shared point shape keeps every chart component
 * on the frontend (LineChart/BarChart) generic across domains. */
export class AnalyticsTimeSeriesPointDto {
  @ApiProperty({
    description: '"YYYY-MM-DD" for DAY/WEEK granularity, "YYYY-MM" for YEAR.',
  })
  bucket!: string;

  @ApiProperty() value!: number;

  @ApiProperty({ required: false, nullable: true }) total?: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ example: '2026-07-05' }) snapshotDate!: string;
  @ApiProperty() productivityScore!: number;
  @ApiProperty() habitScore!: number;
  @ApiProperty() plannerScore!: number;
  @ApiProperty() goalScore!: number;
  @ApiProperty() journalScore!: number;
  @ApiProperty() focusMinutes!: number;
  @ApiProperty() streakDays!: number;
  @ApiProperty({
    description:
      'Active AiInsight count — Analytics never generates or modifies insights, only counts them.',
  })
  activeInsightCount!: number;
  @ApiProperty({
    description:
      'Unread Notification count — Analytics never marks notifications read, only counts them.',
  })
  unreadNotificationCount!: number;
  @ApiProperty({
    description:
      'True when this row was read from AnalyticsSnapshot (cache hit); false when it was computed fresh and then persisted.',
  })
  cached!: boolean;
}

export class ProductivitySummaryDto {
  @ApiProperty() averageCompletionRate!: number;
  @ApiProperty({
    description: 'This-window vs. the equally-long window before it.',
  })
  deltaPercent!: number;
  @ApiProperty({ type: [String] }) bestWeekdays!: string[];
}

export class ProductivityAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty({ example: '2026-06-29' }) from!: string;
  @ApiProperty({ example: '2026-07-05' }) to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description:
      'value=completed Task+PlannerBlock count, total=due/scheduled count.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: ProductivitySummaryDto })
  summary!: ProductivitySummaryDto;
}

export class HabitsSummaryDto {
  @ApiProperty() averageCompletionRate!: number;
  @ApiProperty() totalActiveHabits!: number;
  @ApiProperty() totalLogs!: number;
}

export class HabitsAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description: 'value=HabitLog count, total=active habit count that day.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: HabitsSummaryDto }) summary!: HabitsSummaryDto;
}

export class GoalsSummaryDto {
  @ApiProperty() activeCount!: number;
  @ApiProperty() completedCount!: number;
  @ApiProperty() completionRate!: number;
  @ApiProperty() averageProgressPercent!: number;
}

export class GoalsAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description:
      'value=goals that transitioned to COMPLETED that bucket (approximated from Goal.updatedAt — Goal has no dedicated completedAt column), no total.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: GoalsSummaryDto }) summary!: GoalsSummaryDto;
}

export class PlannerSummaryDto {
  @ApiProperty() averageUtilizationRate!: number;
  @ApiProperty() totalFocusMinutes!: number;
  @ApiProperty() totalBlocksCompleted!: number;
}

export class PlannerAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description:
      'value=completed block minutes, total=scheduled block minutes.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: PlannerSummaryDto }) summary!: PlannerSummaryDto;
}

export class JournalSummaryDto {
  @ApiProperty() consistencyRate!: number;
  @ApiProperty({ enum: ['IMPROVING', 'DECLINING', 'STABLE'] })
  moodTrendDirection!: 'IMPROVING' | 'DECLINING' | 'STABLE';
  @ApiProperty() moodTrendConsecutiveDays!: number;
  @ApiProperty({ nullable: true }) averageMoodScore!: number | null;
}

export class JournalAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description:
      'value=average mood score (1-5) for entries that bucket, total=entry count.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: JournalSummaryDto }) summary!: JournalSummaryDto;
}

export class CalendarSummaryDto {
  @ApiProperty() totalEvents!: number;
  @ApiProperty() upcomingEvents!: number;
  @ApiProperty({ nullable: true }) busiestWeekday!: string | null;
  @ApiProperty() averageEventsPerDay!: number;
}

export class CalendarAnalyticsResponseDto {
  @ApiProperty({ enum: AnalyticsPeriod }) period!: AnalyticsPeriod;
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty({
    type: [AnalyticsTimeSeriesPointDto],
    description: 'value=event count, no total.',
  })
  series!: AnalyticsTimeSeriesPointDto[];
  @ApiProperty({ type: CalendarSummaryDto }) summary!: CalendarSummaryDto;
}
