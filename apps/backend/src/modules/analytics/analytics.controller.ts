import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsPeriodQueryDto } from './dto/analytics-period-query.dto.js';
import {
  AnalyticsExportResponseDto,
  AnalyticsExportResultDto,
  PaginatedAnalyticsExportsResponseDto,
} from './dto/analytics-export-response.dto.js';
import {
  AnalyticsOverviewResponseDto,
  CalendarAnalyticsResponseDto,
  GoalsAnalyticsResponseDto,
  HabitsAnalyticsResponseDto,
  JournalAnalyticsResponseDto,
  PlannerAnalyticsResponseDto,
  ProductivityAnalyticsResponseDto,
} from './dto/analytics-response.dto.js';
import { CreateAnalyticsExportDto } from './dto/create-analytics-export.dto.js';
import { ListAnalyticsExportsQueryDto } from './dto/list-analytics-exports-query.dto.js';

/**
 * Every endpoint here is a read, or an export the user explicitly requested (`POST
 * /analytics/export`) — Analytics never writes to any other module's data, per this milestone's
 * own "read only" business rule. `export` has no `:id` sibling route in this controller to worry
 * about ordering against (unlike habits.controller.ts's `today`/`summary`/`history`), since
 * Analytics has no per-resource detail endpoint at all.
 */
@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly snapshotService: AnalyticsSnapshotService,
    private readonly exportService: AnalyticsExportService,
  ) {}

  @Get('overview')
  @ApiOkResponse({ type: AnalyticsOverviewResponseDto })
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnalyticsOverviewResponseDto> {
    const [snapshot, enrichment] = await Promise.all([
      this.snapshotService.getOrCreateToday(user.id),
      this.analyticsService.getOverviewEnrichment(user.id),
    ]);
    return { ...snapshot, ...enrichment };
  }

  @Get('productivity')
  @ApiOkResponse({ type: ProductivityAnalyticsResponseDto })
  getProductivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<ProductivityAnalyticsResponseDto> {
    return this.analyticsService.getProductivity(user.id, query.period!);
  }

  @Get('habits')
  @ApiOkResponse({ type: HabitsAnalyticsResponseDto })
  getHabits(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<HabitsAnalyticsResponseDto> {
    return this.analyticsService.getHabits(user.id, query.period!);
  }

  @Get('goals')
  @ApiOkResponse({ type: GoalsAnalyticsResponseDto })
  getGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<GoalsAnalyticsResponseDto> {
    return this.analyticsService.getGoals(user.id, query.period!);
  }

  @Get('planner')
  @ApiOkResponse({ type: PlannerAnalyticsResponseDto })
  getPlanner(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<PlannerAnalyticsResponseDto> {
    return this.analyticsService.getPlanner(user.id, query.period!);
  }

  @Get('journal')
  @ApiOkResponse({ type: JournalAnalyticsResponseDto })
  getJournal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<JournalAnalyticsResponseDto> {
    return this.analyticsService.getJournal(user.id, query.period!);
  }

  @Get('calendar')
  @ApiOkResponse({ type: CalendarAnalyticsResponseDto })
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsPeriodQueryDto,
  ): Promise<CalendarAnalyticsResponseDto> {
    return this.analyticsService.getCalendar(user.id, query.period!);
  }

  @Get('export')
  @ApiOkResponse({ type: PaginatedAnalyticsExportsResponseDto })
  getExports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAnalyticsExportsQueryDto,
  ): Promise<PaginatedResult<AnalyticsExportResponseDto>> {
    return this.exportService.findAll(user.id, query);
  }

  @Post('export')
  @ApiCreatedResponse({ type: AnalyticsExportResultDto })
  createExport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAnalyticsExportDto,
  ): Promise<AnalyticsExportResultDto> {
    return this.exportService.create(user.id, dto);
  }
}
