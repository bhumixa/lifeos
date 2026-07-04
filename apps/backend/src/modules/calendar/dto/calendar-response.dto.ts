import { ApiProperty } from '@nestjs/swagger';
import {
  CalendarProvider,
  CalendarSource,
  CalendarStatus,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

export class CalendarResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: CalendarProvider }) provider!: CalendarProvider;
  @ApiProperty() color!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() eventCount!: number;
  @ApiProperty({
    nullable: true,
    description: 'lastSync of the most recent CalendarSync attempt, if any.',
  })
  lastSyncedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Swagger-only response shape — CalendarEventsService builds this itself (like
 * PlannerBlockResponseDto/GoalResponseDto) because `conflictsWith` isn't a Prisma column, it's
 * computed on read from planner/utils/scheduler.util.ts's overlap helpers (see the class doc on
 * CalendarEvent in prisma/schema.prisma). */
export class CalendarEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() calendarId!: string;
  @ApiProperty({ nullable: true }) plannerBlockId!: string | null;
  @ApiProperty({ nullable: true }) taskId!: string | null;
  @ApiProperty({ nullable: true }) goalId!: string | null;
  @ApiProperty({ nullable: true }) journalEntryId!: string | null;
  @ApiProperty({ nullable: true }) externalId!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() startTime!: Date;
  @ApiProperty() endTime!: Date;
  @ApiProperty() allDay!: boolean;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ enum: CalendarSource }) source!: CalendarSource;
  @ApiProperty({ enum: CalendarStatus }) status!: CalendarStatus;
  @ApiProperty({
    type: [String],
    description:
      'ids of other ACTIVE events in the same calendar whose time range overlaps this one.',
  })
  conflictsWith!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedCalendarEventsResponseDto {
  @ApiProperty({ type: [CalendarEventResponseDto] })
  data!: CalendarEventResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class CalendarSyncResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() calendarId!: string;
  @ApiProperty({ nullable: true }) lastSync!: Date | null;
  @ApiProperty({ enum: ['PENDING', 'SUCCESS', 'FAILED'] }) status!: string;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
  @ApiProperty() createdAt!: Date;
}
