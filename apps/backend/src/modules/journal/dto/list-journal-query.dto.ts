import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { JournalType } from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SORTABLE_FIELDS = ['date', 'createdAt'] as const;
export type JournalSortField = (typeof SORTABLE_FIELDS)[number];

/** Plain paginated listing — GET /journal. The richer filter set (mood/energy/tags/goal/keyword)
 * lives on SearchJournalQueryDto/GET /journal/search instead, so this stays a simple "browse
 * everything, optionally by type" endpoint. */
export class ListJournalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JournalType })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'date' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: JournalSortField = 'date';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
