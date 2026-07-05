import { Test, TestingModule } from '@nestjs/testing';
import { mkdir, writeFile } from 'node:fs/promises';
import { ExportFormat } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { AnalyticsReportService } from './analytics-report.service.js';
import { ExportGeneratorRegistry } from './exporters/export-generator.registry.js';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

interface CreatedExportRow {
  userId: string;
  type: string;
  format: ExportFormat;
  status: string;
  filePath: string | null;
  errorMessage: string | null;
}

describe('AnalyticsExportService', () => {
  let service: AnalyticsExportService;
  let prisma: {
    analyticsExport: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
  };
  let reportService: { buildReport: jest.Mock };
  let registry: { resolve: jest.Mock };

  const userId = 'user-1';
  const report = {
    title: 'Productivity Report',
    generatedAt: new Date('2026-07-05T00:00:00Z'),
    period: 'WEEK (2026-06-29 to 2026-07-05)',
    headers: ['Bucket', 'Value'],
    rows: [['2026-07-05', 3]],
    summary: { averageCompletionRate: 60 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      analyticsExport: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
    };
    reportService = { buildReport: jest.fn().mockResolvedValue(report) };
    registry = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnalyticsReportService, useValue: reportService },
        { provide: ExportGeneratorRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(AnalyticsExportService);
  });

  it('writes a successful CSV/JSON generation to disk and persists a COMPLETED row', async () => {
    registry.resolve.mockReturnValue({
      generate: jest.fn().mockReturnValue({
        success: true,
        content: 'Bucket,Value\n2026-07-05,3',
        extension: 'csv',
      }),
    });
    prisma.analyticsExport.create.mockImplementation(
      ({ data }: { data: CreatedExportRow }) =>
        Promise.resolve({ id: 'export-1', ...data, createdAt: new Date() }),
    );

    const result = await service.create(userId, {
      type: 'PRODUCTIVITY',
      format: ExportFormat.CSV,
    });

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining(userId),
      'Bucket,Value\n2026-07-05,3',
      'utf-8',
    );
    expect(result.status).toBe('COMPLETED');
    expect(result.content).toBe('Bucket,Value\n2026-07-05,3');
    expect(result.filePath).toEqual(expect.stringContaining('.csv'));
    expect(prisma.analyticsExport.create).toHaveBeenCalledWith(
      matching({
        data: matching({ userId, status: 'COMPLETED', errorMessage: null }),
      }),
    );
  });

  it('persists a FAILED row with no file written for an unimplemented format (PDF)', async () => {
    registry.resolve.mockReturnValue({
      generate: jest.fn().mockReturnValue({
        success: false,
        message: 'NOT_IMPLEMENTED: PDF export is not yet implemented.',
      }),
    });
    prisma.analyticsExport.create.mockImplementation(
      ({ data }: { data: CreatedExportRow }) =>
        Promise.resolve({ id: 'export-2', ...data, createdAt: new Date() }),
    );

    const result = await service.create(userId, {
      type: 'OVERVIEW',
      format: ExportFormat.PDF,
    });

    expect(writeFile).not.toHaveBeenCalled();
    expect(result.status).toBe('FAILED');
    expect(result.filePath).toBeNull();
    expect(result.content).toBeNull();
    expect(result.errorMessage).toContain('NOT_IMPLEMENTED');
  });

  it('scopes findAll to the requesting user', async () => {
    await service.findAll(userId, { page: 1, pageSize: 20 });
    expect(prisma.analyticsExport.findMany).toHaveBeenCalledWith(
      matching({ where: { userId } }),
    );
    expect(prisma.analyticsExport.count).toHaveBeenCalledWith({
      where: { userId },
    });
  });
});
