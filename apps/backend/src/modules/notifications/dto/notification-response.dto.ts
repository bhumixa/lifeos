import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty({ enum: NotificationPriority }) priority!: NotificationPriority;
  @ApiProperty({ enum: NotificationStatus }) status!: NotificationStatus;
  @ApiProperty() scheduledFor!: Date;
  @ApiProperty({ nullable: true, type: Date }) deliveredAt!: Date | null;
  @ApiProperty({ nullable: true, type: Date }) readAt!: Date | null;
  @ApiProperty({ nullable: true, type: Object })
  payload!: Record<string, unknown> | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
