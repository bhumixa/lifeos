import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InsightType } from '../../../../generated/prisma/index.js';

/** POST /ai/insights/generate — omitting `type` generates one insight for every auto-generatable
 * domain (see AiInsightsService.DEFAULT_GENERATE_TYPES); passing one generates just that type. */
export class GenerateInsightDto {
  @ApiPropertyOptional({ enum: InsightType })
  @IsOptional()
  @IsEnum(InsightType)
  type?: InsightType;
}
