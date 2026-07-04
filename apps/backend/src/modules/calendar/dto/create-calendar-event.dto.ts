import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCalendarEventDto {
  @ApiProperty({ description: 'The Calendar this event belongs to.' })
  @IsUUID('4')
  calendarId!: string;

  @ApiPropertyOptional({
    description:
      'Milestone 11: optional PlannerBlock this event was created from — "Planner blocks may ' +
      'create calendar events." Must belong to the requesting user.',
  })
  @IsOptional()
  @IsUUID('4')
  plannerBlockId?: string;

  @ApiPropertyOptional({
    description:
      'Milestone 11: optional Task this event tracks — "Tasks may optionally create events." ' +
      'Must belong to the requesting user.',
  })
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @ApiPropertyOptional({
    description:
      'Milestone 11: optional Goal this event represents (e.g. a milestone deadline) — "Goals ' +
      'may create milestone events." Must belong to the requesting user.',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;

  @ApiPropertyOptional({
    description:
      'Milestone 11: optional JournalEntry this event references — "Journal entries remain ' +
      'read-only references." Must belong to the requesting user.',
  })
  @IsOptional()
  @IsUUID('4')
  journalEntryId?: string;

  @ApiProperty({ example: 'Dentist appointment' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2026-07-06T14:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2026-07-06T15:00:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;
}
