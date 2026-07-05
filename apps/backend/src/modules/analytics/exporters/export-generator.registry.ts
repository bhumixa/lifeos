import { Injectable } from '@nestjs/common';
import { ExportFormat } from '../../../../generated/prisma/index.js';
import { CsvExportGenerator } from './csv-export.generator.js';
import type { ExportGenerator } from './export-generator.interface.js';
import { JsonExportGenerator } from './json-export.generator.js';
import { PdfExportGenerator } from './pdf-export.generator.js';

/** Maps an ExportFormat to the generator that implements it — the single place
 * AnalyticsExportService needs to know every concrete generator class exists, the same
 * data-driven-catalog role CalendarProviderRegistry/NotificationChannelRegistry/AiProviderRegistry
 * already play for their own adapters. */
@Injectable()
export class ExportGeneratorRegistry {
  private readonly generators: Record<ExportFormat, ExportGenerator>;

  constructor(
    csv: CsvExportGenerator,
    json: JsonExportGenerator,
    pdf: PdfExportGenerator,
  ) {
    this.generators = {
      [ExportFormat.CSV]: csv,
      [ExportFormat.JSON]: json,
      [ExportFormat.PDF]: pdf,
    };
  }

  resolve(format: ExportFormat): ExportGenerator {
    return this.generators[format];
  }
}
