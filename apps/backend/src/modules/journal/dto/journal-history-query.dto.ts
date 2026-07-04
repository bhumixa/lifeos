import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { JournalType } from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

/** GET /journal/history — the same "paginated timeline, optionally bounded by a date range"
 * shape as HabitsService.history (see HistoryQueryDto), ordered newest-first. */
export class JournalHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JournalType })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Inclusive lower bound on date.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-07-04',
    description: 'Inclusive upper bound on date.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
