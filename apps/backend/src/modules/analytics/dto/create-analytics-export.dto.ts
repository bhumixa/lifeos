import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  AnalyticsPeriod,
  ExportFormat,
} from '../../../../generated/prisma/index.js';

/** A 1:1 match to the seven read-only GET domain endpoints this milestone builds — validated
 * against this fixed set rather than a new Prisma enum, since `AnalyticsExport.type` isn't named
 * in the milestone brief's own Enums section (matching the exact precedent `Goal.category`/
 * `CalendarSync.status` already set — see the comment on AnalyticsExport in prisma/schema.prisma). */
export const ANALYTICS_REPORT_TYPES = [
  'OVERVIEW',
  'PRODUCTIVITY',
  'HABITS',
  'GOALS',
  'PLANNER',
  'JOURNAL',
  'CALENDAR',
] as const;
export type AnalyticsReportType = (typeof ANALYTICS_REPORT_TYPES)[number];

export class CreateAnalyticsExportDto {
  @ApiProperty({ enum: ANALYTICS_REPORT_TYPES })
  @IsIn(ANALYTICS_REPORT_TYPES)
  type!: AnalyticsReportType;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @ApiPropertyOptional({
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.WEEK,
    description:
      'Ignored for `type: "OVERVIEW"`, which is always a single day\'s snapshot.',
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.WEEK;
}
