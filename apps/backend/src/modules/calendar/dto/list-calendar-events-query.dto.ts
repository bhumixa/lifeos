import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CalendarStatus } from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/** Same paginated-list shape every other resource's GET (plural) endpoint uses. The Calendar
 * Grid/Agenda views drive this with `from`/`to` set to the visible range (month/week/day) and a
 * generous `pageSize` (capped at 100 by PaginationQueryDto, the same ceiling every list endpoint
 * shares) rather than a bespoke unpaginated "whole range" shape. */
export class ListCalendarEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  calendarId?: string;

  @ApiPropertyOptional({
    example: '2026-07-01T00:00:00.000Z',
    description: 'Only events whose startTime is >= from.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-07-31T23:59:59.000Z',
    description: 'Only events whose startTime is <= to.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: CalendarStatus })
  @IsOptional()
  @IsEnum(CalendarStatus)
  status?: CalendarStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  goalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  plannerBlockId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  journalEntryId?: string;
}
