import { ApiProperty } from '@nestjs/swagger';
import {
  InsightStatus,
  InsightType,
} from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

/** Swagger-only response shape — AiInsightsService builds this itself (like GoalResponseDto/
 * HabitResponseDto) so nullability is documented explicitly. `sourceData` is returned verbatim —
 * see the class doc on AiInsight in prisma/schema.prisma for why the Dashboard reads structured
 * numbers from it directly rather than parsing `content`. */
export class AiInsightResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: InsightType }) type!: InsightType;
  @ApiProperty() title!: string;
  @ApiProperty() summary!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ example: 0.85 }) confidence!: number;
  @ApiProperty({ enum: InsightStatus }) status!: InsightStatus;
  @ApiProperty({ type: Object, nullable: true }) sourceData!: Record<
    string,
    unknown
  > | null;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty({ nullable: true }) expiresAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedAiInsightsResponseDto {
  @ApiProperty({ type: [AiInsightResponseDto] })
  data!: AiInsightResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
