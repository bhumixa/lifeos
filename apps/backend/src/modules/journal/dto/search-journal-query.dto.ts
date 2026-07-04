import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  Energy,
  JournalType,
  Mood,
} from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SORTABLE_FIELDS = ['date', 'createdAt'] as const;
export type JournalSearchSortField = (typeof SORTABLE_FIELDS)[number];

/** GET /journal/search — the rich filter set the milestone brief asks for (date range, mood,
 * energy, tags, goal, type, keyword), kept on its own DTO/endpoint rather than folded into GET
 * /journal so the plain "browse everything" listing stays simple. `tag` is a single-value filter
 * (entries containing that tag), matching TaskQueryParams's own single-`tag` convention rather
 * than inventing a new multi-tag CSV syntax. */
export class SearchJournalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive match against title or content.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

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

  @ApiPropertyOptional({ enum: Mood })
  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;

  @ApiPropertyOptional({ enum: Energy })
  @IsOptional()
  @IsEnum(Energy)
  energy?: Energy;

  @ApiPropertyOptional({
    description: 'Restrict to entries containing this tag.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({
    description: 'Restrict to entries linked to this Goal.',
  })
  @IsOptional()
  @IsUUID('4')
  goalId?: string;

  @ApiPropertyOptional({ enum: JournalType })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'date' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: JournalSearchSortField = 'date';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
