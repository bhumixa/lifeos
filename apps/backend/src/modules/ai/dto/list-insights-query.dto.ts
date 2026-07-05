import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  InsightStatus,
  InsightType,
} from '../../../../generated/prisma/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

const SORTABLE_FIELDS = ['generatedAt', 'createdAt', 'confidence'] as const;
export type InsightSortField = (typeof SORTABLE_FIELDS)[number];

export class ListInsightsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: InsightType })
  @IsOptional()
  @IsEnum(InsightType)
  type?: InsightType;

  @ApiPropertyOptional({
    enum: InsightStatus,
    default: InsightStatus.ACTIVE,
    description:
      'Defaults to ACTIVE — pass explicitly to include archived/dismissed insights.',
  })
  @IsOptional()
  @IsEnum(InsightStatus)
  status?: InsightStatus;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'generatedAt' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: InsightSortField = 'generatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
