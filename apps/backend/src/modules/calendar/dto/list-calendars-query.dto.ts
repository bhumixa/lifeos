import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CalendarProvider } from '../../../../generated/prisma/index.js';

export class ListCalendarsQueryDto {
  @ApiPropertyOptional({ enum: CalendarProvider })
  @IsOptional()
  @IsEnum(CalendarProvider)
  provider?: CalendarProvider;

  @ApiPropertyOptional({
    description:
      'Filter by enabled state. Omit to return both enabled and disabled calendars.',
  })
  @IsOptional()
  // Query strings arrive as "true"/"false" strings — same explicit mapping ListGoalsQueryDto's
  // `archived` uses, since Boolean("false") would otherwise evaluate to `true`.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  enabled?: boolean;
}
