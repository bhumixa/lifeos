import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { UseFreezeDayDto } from './dto/use-freeze-day.dto.js';
import { FreezeDayStatusResponseDto } from './dto/freeze-day-status-response.dto.js';
import { FreezeDaysService } from './freeze-days.service.js';

@ApiTags('freeze-days')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('freeze-days')
export class FreezeDaysController {
  constructor(private readonly freezeDaysService: FreezeDaysService) {}

  @Post('use')
  @ApiCreatedResponse({ type: FreezeDayStatusResponseDto })
  use(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UseFreezeDayDto,
  ): Promise<FreezeDayStatusResponseDto> {
    return this.freezeDaysService.use(user.id, dto);
  }
}
