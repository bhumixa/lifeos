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
import { CreateHabitDto } from './dto/create-habit.dto.js';
import { CreateHabitLogDto } from './dto/create-habit-log.dto.js';
import { DeleteHabitLogQueryDto } from './dto/delete-habit-log-query.dto.js';
import {
  HabitLogResponseDto,
  HabitResponseDto,
  HabitSummaryResponseDto,
  PaginatedHabitLogsResponseDto,
  PaginatedHabitsResponseDto,
} from './dto/habit-response.dto.js';
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { ListHabitsQueryDto } from './dto/list-habits-query.dto.js';
import { UpdateHabitDto } from './dto/update-habit.dto.js';
import { UpdateHabitLogDto } from './dto/update-habit-log.dto.js';
import { HabitsService } from './habits.service.js';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedHabitsResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHabitsQueryDto,
  ): Promise<PaginatedResult<HabitResponseDto>> {
    return this.habitsService.findAll(user.id, query);
  }

  // 'today'/'summary'/'history' are literal segments and must be declared before ':id' — same
  // route-ordering rule as routines.controller.ts's ':id/steps/reorder' vs ':id/steps/:stepId'.
  @Get('today')
  @ApiOkResponse({ type: [HabitResponseDto] })
  today(@CurrentUser() user: AuthenticatedUser): Promise<HabitResponseDto[]> {
    return this.habitsService.today(user.id);
  }

  @Get('summary')
  @ApiOkResponse({ type: HabitSummaryResponseDto })
  summary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HabitSummaryResponseDto> {
    return this.habitsService.summary(user.id);
  }

  @Get('history')
  @ApiOkResponse({ type: PaginatedHabitLogsResponseDto })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HistoryQueryDto,
  ): Promise<PaginatedResult<HabitLogResponseDto>> {
    return this.habitsService.history(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: HabitResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HabitResponseDto> {
    return this.habitsService.findOne(user.id, id);
  }

  @Post()
  @ApiCreatedResponse({ type: HabitResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHabitDto,
  ): Promise<HabitResponseDto> {
    return this.habitsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: HabitResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabitDto,
  ): Promise<HabitResponseDto> {
    return this.habitsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Habit soft-deleted.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.habitsService.remove(user.id, id);
  }

  @Post(':id/log')
  @ApiCreatedResponse({ type: HabitLogResponseDto })
  createLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHabitLogDto,
  ): Promise<HabitLogResponseDto> {
    return this.habitsService.createLog(user.id, id, dto);
  }

  @Patch(':id/log')
  @ApiOkResponse({ type: HabitLogResponseDto })
  updateLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabitLogDto,
  ): Promise<HabitLogResponseDto> {
    return this.habitsService.updateLog(user.id, id, dto);
  }

  @Delete(':id/log')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: "Removes the given (or today's, by default) log.",
  })
  removeLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteHabitLogQueryDto,
  ): Promise<void> {
    return this.habitsService.removeLog(user.id, id, query.date);
  }
}
