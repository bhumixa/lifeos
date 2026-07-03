import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { AchievementResponseDto } from './dto/achievement-response.dto.js';
import { AchievementsService } from './achievements.service.js';

@ApiTags('achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOkResponse({ type: [AchievementResponseDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AchievementResponseDto[]> {
    return this.achievementsService.getAll(user.id);
  }

  @Get('unlocked')
  @ApiOkResponse({ type: [AchievementResponseDto] })
  findUnlocked(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AchievementResponseDto[]> {
    return this.achievementsService.getUnlocked(user.id);
  }
}
