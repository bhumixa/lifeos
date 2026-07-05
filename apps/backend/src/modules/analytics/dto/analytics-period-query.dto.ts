import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AnalyticsPeriod } from '../../../../generated/prisma/index.js';

/** Shared query shape for every domain analytics endpoint (Productivity/Habits/Goals/Planner/
 * Journal/Calendar) — `period` picks the chart window/granularity (see
 * utils/analytics-bucket.util.ts's resolvePeriodRange), defaulting to WEEK, the same default
 * every dashboard-facing trend in this codebase already uses (e.g. AiAnalysisService's own
 * TREND_WINDOW_DAYS). */
export class AnalyticsPeriodQueryDto {
  @ApiPropertyOptional({ enum: AnalyticsPeriod, default: AnalyticsPeriod.WEEK })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.WEEK;
}
