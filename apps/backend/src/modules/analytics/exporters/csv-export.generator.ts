import { Injectable } from '@nestjs/common';
import { ExportFormat } from '../../../../generated/prisma/index.js';
import type {
  ExportGenerationInput,
  ExportGenerationResult,
  ExportGenerator,
} from './export-generator.interface.js';

/** One of the two generators that "does anything real" today (JsonExportGenerator is the other) —
 * the same role MockAiProvider/LocalCalendarProvider/InAppChannel play among their own siblings. */
@Injectable()
export class CsvExportGenerator implements ExportGenerator {
  readonly format = ExportFormat.CSV;

  generate(input: ExportGenerationInput): ExportGenerationResult {
    const lines = [
      input.headers.map(csvEscape).join(','),
      ...input.rows.map((row) =>
        row.map((cell) => csvEscape(String(cell))).join(','),
      ),
    ];
    return { success: true, content: lines.join('\n'), extension: 'csv' };
  }
}

/** RFC 4180-style quoting — a cell containing a comma, quote, or newline is wrapped in quotes with
 * any internal quote doubled. */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
