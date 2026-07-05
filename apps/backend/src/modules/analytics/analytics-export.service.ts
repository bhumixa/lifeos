import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { type AnalyticsExport } from '../../../generated/prisma/index.js';
import { AnalyticsReportService } from './analytics-report.service.js';
import type {
  AnalyticsExportResponseDto,
  AnalyticsExportResultDto,
} from './dto/analytics-export-response.dto.js';
import type { CreateAnalyticsExportDto } from './dto/create-analytics-export.dto.js';
import type { ListAnalyticsExportsQueryDto } from './dto/list-analytics-exports-query.dto.js';
import { ExportGeneratorRegistry } from './exporters/export-generator.registry.js';

/** Files written by `create` land under `<cwd>/exports/<userId>/` — no S3/Cloudinary provider
 * exists anywhere in this codebase (the same "don't add object storage without justification"
 * call `JournalAttachment` already made), and these are small, user-owned text exports, not the
 * kind of durable binary asset that would justify one. This is a local-disk MVP, not durable
 * cross-deploy storage — a documented limitation, not an oversight (see docs/changelog.md's
 * Milestone 14 entry). */
const EXPORTS_ROOT = join(process.cwd(), 'exports');

/**
 * Orchestrates one export request end to end: asks AnalyticsReportService for the report data,
 * hands it to the resolved ExportGenerator (CSV/JSON real; PDF an honest NOT_IMPLEMENTED result),
 * writes a successful result to local disk, and persists exactly one AnalyticsExport row per
 * attempt either way. Never re-derives or duplicates report data of its own — every number in an
 * export comes from AnalyticsReportService, which itself only reads from AnalyticsService.
 */
@Injectable()
export class AnalyticsExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: AnalyticsReportService,
    private readonly generators: ExportGeneratorRegistry,
  ) {}

  async findAll(
    userId: string,
    query: ListAnalyticsExportsQueryDto,
  ): Promise<PaginatedResult<AnalyticsExportResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [exports, total] = await Promise.all([
      this.prisma.analyticsExport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.analyticsExport.count({ where: { userId } }),
    ]);

    return {
      data: exports.map((row) => this.toResponse(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async create(
    userId: string,
    dto: CreateAnalyticsExportDto,
  ): Promise<AnalyticsExportResultDto> {
    const report = await this.reportService.buildReport(
      userId,
      dto.type,
      dto.period,
    );
    const generator = this.generators.resolve(dto.format);
    const result = generator.generate({
      title: report.title,
      generatedAt: report.generatedAt,
      period: report.period,
      headers: report.headers,
      rows: report.rows,
      summary: report.summary,
    });

    if (!result.success) {
      const failed = await this.prisma.analyticsExport.create({
        data: {
          userId,
          type: dto.type,
          format: dto.format,
          status: 'FAILED',
          filePath: null,
          errorMessage: result.message ?? 'Export failed.',
        },
      });
      return { ...this.toResponse(failed), content: null };
    }

    const filePath = await this.writeToDisk(
      userId,
      dto.type,
      result.content ?? '',
      result.extension ?? 'txt',
    );
    const created = await this.prisma.analyticsExport.create({
      data: {
        userId,
        type: dto.type,
        format: dto.format,
        status: 'COMPLETED',
        filePath,
        errorMessage: null,
      },
    });
    return { ...this.toResponse(created), content: result.content ?? null };
  }

  private async writeToDisk(
    userId: string,
    type: string,
    content: string,
    extension: string,
  ): Promise<string> {
    const dir = join(EXPORTS_ROOT, userId);
    await mkdir(dir, { recursive: true });
    const fileName = `${type.toLowerCase()}-${Date.now()}.${extension}`;
    const filePath = join(dir, fileName);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  private toResponse(row: AnalyticsExport): AnalyticsExportResponseDto {
    return {
      id: row.id,
      type: row.type,
      format: row.format,
      status: row.status,
      filePath: row.filePath,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
    };
  }
}
