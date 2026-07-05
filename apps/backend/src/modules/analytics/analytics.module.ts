import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { CalendarModule } from '../calendar/calendar.module.js';
import { GoalsModule } from '../goals/goals.module.js';
import { HabitsModule } from '../habits/habits.module.js';
import { JournalModule } from '../journal/journal.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { StreaksModule } from '../streaks/streaks.module.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { AnalyticsReportService } from './analytics-report.service.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { CsvExportGenerator } from './exporters/csv-export.generator.js';
import { ExportGeneratorRegistry } from './exporters/export-generator.registry.js';
import { JsonExportGenerator } from './exporters/json-export.generator.js';
import { PdfExportGenerator } from './exporters/pdf-export.generator.js';

/**
 * Imports every module whose *service* AnalyticsService actually injects — Habits/Streaks/Goals/
 * Journal/Notifications/Calendar (via CalendarModule's `CalendarEventsService`)/AiInsights (via
 * AiModule) — the widest read-only fan-in in this codebase, one wider than AI Coach's own seven.
 * `CalendarModule`/`AiModule` each gained the same one-line additive `exports: [...]` Streaks/
 * Goals already got for AI Coach in Milestone 13 (see those modules' own class docs) — no other
 * existing behavior changed anywhere. `TasksModule`/`PlannerModule`/`RoutinesModule` are
 * deliberately **not** imported: AnalyticsService reads the Task/PlannerBlock/PlannerDay tables
 * directly via the globally-registered PrismaService for its own time-series needs (the same "raw
 * read for a cross-cutting query no existing method exposes" reasoning AiAnalysisService already
 * established), so there is no service from those modules to inject — Routines isn't named as an
 * analytics source anywhere in this milestone's own brief either.
 *
 * Exports nothing — like AiModule, no other module reuses AnalyticsModule (yet); it is the new
 * end of this codebase's module dependency chain.
 */
@Module({
  imports: [
    HabitsModule,
    StreaksModule,
    GoalsModule,
    JournalModule,
    CalendarModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsReportService,
    AnalyticsExportService,
    AnalyticsSnapshotService,
    ExportGeneratorRegistry,
    CsvExportGenerator,
    JsonExportGenerator,
    PdfExportGenerator,
  ],
})
export class AnalyticsModule {}
