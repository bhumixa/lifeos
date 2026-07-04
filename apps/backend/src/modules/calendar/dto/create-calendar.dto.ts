import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CalendarProvider } from '../../../../generated/prisma/index.js';

export class CreateCalendarDto {
  @ApiProperty({ example: 'Personal' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    enum: CalendarProvider,
    default: CalendarProvider.LOCAL,
    description:
      'Creating a GOOGLE/MICROSOFT/APPLE/ICAL calendar today only creates this row — no OAuth ' +
      'flow or external API call happens anywhere in this codebase yet (see the class doc on ' +
      'ICalendarProvider). POST /calendar/sync against it will record a FAILED CalendarSync.',
  })
  @IsOptional()
  @IsEnum(CalendarProvider)
  provider?: CalendarProvider;

  @ApiProperty({ example: '#3F51B5' })
  @IsString()
  @MaxLength(20)
  color!: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    default: 'UTC',
    description:
      'IANA timezone for this calendar specifically — independent of the requesting User.timezone ' +
      '(see the class doc on Calendar in prisma/schema.prisma).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
