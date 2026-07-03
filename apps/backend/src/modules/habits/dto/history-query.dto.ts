import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class HistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Restrict to a single habit.' })
  @IsOptional()
  @IsUUID()
  habitId?: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Inclusive lower bound on date.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Inclusive upper bound on date.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
