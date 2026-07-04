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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from './dto/notification-response.dto.js';
import { NotificationPreferenceResponseDto } from './dto/notification-preference-response.dto.js';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationsService } from './notifications.service.js';

/**
 * No `POST /notifications` exists here — see the class doc on NotificationsService for why
 * creation is exclusively an internal side effect of NotificationSchedulerService reacting to a
 * domain event, never a client-authored write, per this milestone's "do not deliver notifications
 * immediately inside controllers" business rule.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get('unread')
  @ApiOkResponse({ type: [NotificationResponseDto] })
  findUnread(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.findUnread(user.id);
  }

  @Get('preferences')
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferencesService.getOrCreate(user.id);
  }

  @Patch('preferences')
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.preferencesService.update(user.id, dto);
  }

  @Post('read/:id')
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOkResponse({
    description: 'All of this user’s unread notifications are marked read.',
  })
  markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post('dismiss/:id')
  @ApiOkResponse({ type: NotificationResponseDto })
  dismiss(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.dismiss(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.notificationsService.remove(user.id, id);
  }
}
