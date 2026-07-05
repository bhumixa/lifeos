import { ApiProperty } from '@nestjs/swagger';
import { ExportFormat } from '../../../../generated/prisma/index.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';

export class AnalyticsExportResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ enum: ExportFormat }) format!: ExportFormat;
  @ApiProperty({ enum: ['COMPLETED', 'FAILED'] }) status!: string;
  @ApiProperty({ nullable: true }) filePath!: string | null;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedAnalyticsExportsResponseDto {
  @ApiProperty({ type: [AnalyticsExportResponseDto] })
  data!: AnalyticsExportResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

/** `POST /analytics/export`'s own response — extends the plain history shape with the generated
 * file's actual text content. Returned inline rather than via a separate `GET .../download`
 * endpoint (none exists in this milestone's own literal endpoint list) — the frontend triggers a
 * browser download directly from this response body, the same "don't build an endpoint beyond
 * what was asked for" discipline `EventDialog`'s plain-id Advanced Links panel and Journal's
 * metadata-only attachments already established. Null for a FAILED/NOT_IMPLEMENTED attempt (every
 * PDF request today, per this milestone's explicit "architecture only for PDF" instruction). */
export class AnalyticsExportResultDto extends AnalyticsExportResponseDto {
  @ApiProperty({ nullable: true }) content!: string | null;
}
