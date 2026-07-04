import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CalendarStatus } from '../../../../generated/prisma/index.js';
import { CreateCalendarEventDto } from './create-calendar-event.dto.js';

// `calendarId` is inherited from CreateCalendarEventDto and re-settable — moving an event to a
// different one of the user's own calendars is a plain field update, the same way PATCH
// /planner/block/:id lets `type`/`referenceId` change. `status` isn't on the create DTO (a new
// event is always ACTIVE) but is the one field only PATCH exposes, mirroring how
// CompletePlannerBlockDto is its own small DTO for a field CreatePlannerBlockDto doesn't have.
export class UpdateCalendarEventDto extends PartialType(
  CreateCalendarEventDto,
) {
  @ApiPropertyOptional({ enum: CalendarStatus })
  @IsOptional()
  @IsEnum(CalendarStatus)
  status?: CalendarStatus;
}
