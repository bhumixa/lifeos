import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TaskPriority,
  TaskStatus,
} from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'dueDate',
  'priority',
  'title',
] as const;
export type TaskSortField = (typeof SORTABLE_FIELDS)[number];

export class QueryTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive match against title/description.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Exact tag match.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: TaskSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'ISO datetime lower bound on dueDate (inclusive).',
  })
  @IsOptional()
  @IsISO8601()
  dueFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO datetime upper bound on dueDate (exclusive).',
  })
  @IsOptional()
  @IsISO8601()
  dueTo?: string;

  @ApiPropertyOptional({
    description: 'ISO datetime lower bound on completedAt (inclusive).',
  })
  @IsOptional()
  @IsISO8601()
  completedFrom?: string;

  @ApiPropertyOptional({
    description: 'ISO datetime upper bound on completedAt (exclusive).',
  })
  @IsOptional()
  @IsISO8601()
  completedTo?: string;
}
