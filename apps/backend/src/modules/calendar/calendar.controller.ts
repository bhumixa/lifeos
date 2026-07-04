import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { CalendarEventsService } from './calendar-events.service.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarService } from './calendar.service.js';
import {
  CalendarEventResponseDto,
  CalendarResponseDto,
  CalendarSyncResponseDto,
  PaginatedCalendarEventsResponseDto,
} from './dto/calendar-response.dto.js';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import { CreateCalendarDto } from './dto/create-calendar.dto.js';
import { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto.js';
import { ListCalendarsQueryDto } from './dto/list-calendars-query.dto.js';
import { SyncCalendarDto } from './dto/sync-calendar.dto.js';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto.js';
import { UpdateCalendarDto } from './dto/update-calendar.dto.js';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calendarEventsService: CalendarEventsService,
    private readonly calendarSyncService: CalendarSyncService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [CalendarResponseDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCalendarsQueryDto,
  ): Promise<CalendarResponseDto[]> {
    return this.calendarService.findAll(user.id, query);
  }

  // 'events'/'sync' are literal segments and must be declared before ':id' — same route-ordering
  // rule as habits.controller.ts's 'today'/'summary'/'history' vs ':id' and
  // journal.controller.ts's 'history'/'search'/'prompts' vs ':date'.
  @Get('events')
  @ApiOkResponse({ type: PaginatedCalendarEventsResponseDto })
  findAllEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCalendarEventsQueryDto,
  ): Promise<PaginatedResult<CalendarEventResponseDto>> {
    return this.calendarEventsService.findAll(user.id, query);
  }

  @Get('events/:id')
  @ApiOkResponse({ type: CalendarEventResponseDto })
  findOneEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.findOne(user.id, id);
  }

  @Post('events')
  @ApiCreatedResponse({ type: CalendarEventResponseDto })
  createEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.create(user.id, dto);
  }

  @Patch('events/:id')
  @ApiOkResponse({ type: CalendarEventResponseDto })
  updateEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    return this.calendarEventsService.update(user.id, id, dto);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Calendar event deleted.' })
  removeEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.calendarEventsService.remove(user.id, id);
  }

  @Post('sync')
  @ApiCreatedResponse({ type: CalendarSyncResponseDto })
  sync(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncCalendarDto,
  ): Promise<CalendarSyncResponseDto> {
    return this.calendarSyncService.sync(user.id, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: CalendarResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.findOne(user.id, id);
  }

  @Post()
  @ApiCreatedResponse({ type: CalendarResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CalendarResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Calendar deleted (cascades its events/syncs).',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.calendarService.remove(user.id, id);
  }
}
