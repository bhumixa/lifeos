import { Injectable } from '@nestjs/common';
import { ExportFormat } from '../../../../generated/prisma/index.js';
import type {
  ExportGenerationInput,
  ExportGenerationResult,
  ExportGenerator,
} from './export-generator.interface.js';

/** The other generator that "does anything real" today — serializes the same report shape
 * CsvExportGenerator flattens into rows, keeping `headers`/`rows`/`summary` structured rather than
 * pre-joined into text. */
@Injectable()
export class JsonExportGenerator implements ExportGenerator {
  readonly format = ExportFormat.JSON;

  generate(input: ExportGenerationInput): ExportGenerationResult {
    const payload = {
      title: input.title,
      generatedAt: input.generatedAt.toISOString(),
      period: input.period ?? null,
      headers: input.headers,
      rows: input.rows,
      summary: input.summary ?? null,
    };
    return {
      success: true,
      content: JSON.stringify(payload, null, 2),
      extension: 'json',
    };
  }
}
