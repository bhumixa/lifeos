import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { StreaksOverviewResponseDto } from './dto/habit-streak-response.dto.js';
import { StreaksTodayResponseDto } from './dto/streaks-today-response.dto.js';
import { StreaksStatisticsResponseDto } from './dto/streaks-statistics-response.dto.js';
import { HabitStreakDetailResponseDto } from './dto/habit-streak-detail-response.dto.js';
import { StreaksService } from './streaks.service.js';

@ApiTags('streaks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('streaks')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  // 'today'/'statistics'/'habits' are literal segments and must be declared before ':habitId' —
  // same route-ordering rule as habits.controller.ts's 'today'/'summary'/'history' vs ':id'.
  @Get('today')
  @ApiOkResponse({ type: StreaksTodayResponseDto })
  today(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreaksTodayResponseDto> {
    return this.streaksService.getToday(user.id);
  }

  @Get('statistics')
  @ApiOkResponse({ type: StreaksStatisticsResponseDto })
  statistics(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreaksStatisticsResponseDto> {
    return this.streaksService.getStatistics(user.id);
  }

  @Get('habits/:habitId')
  @ApiOkResponse({ type: HabitStreakDetailResponseDto })
  habitStreak(
    @CurrentUser() user: AuthenticatedUser,
    @Param('habitId', ParseUUIDPipe) habitId: string,
  ): Promise<HabitStreakDetailResponseDto> {
    return this.streaksService.getHabitStreak(user.id, habitId);
  }

  @Get()
  @ApiOkResponse({ type: StreaksOverviewResponseDto })
  overview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreaksOverviewResponseDto> {
    return this.streaksService.getOverview(user.id);
  }
}
