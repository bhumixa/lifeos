import { ExportFormat } from '../../../../generated/prisma/index.js';
import { CsvExportGenerator } from './csv-export.generator.js';
import { ExportGeneratorRegistry } from './export-generator.registry.js';
import { JsonExportGenerator } from './json-export.generator.js';
import { PdfExportGenerator } from './pdf-export.generator.js';

describe('ExportGeneratorRegistry', () => {
  const csv = new CsvExportGenerator();
  const json = new JsonExportGenerator();
  const pdf = new PdfExportGenerator();
  const registry = new ExportGeneratorRegistry(csv, json, pdf);

  it('resolves each format to its own distinct generator', () => {
    expect(registry.resolve(ExportFormat.CSV)).toBe(csv);
    expect(registry.resolve(ExportFormat.JSON)).toBe(json);
    expect(registry.resolve(ExportFormat.PDF)).toBe(pdf);
  });

  it('PDF always resolves to an honest NOT_IMPLEMENTED result, never a thrown exception', () => {
    const result = registry.resolve(ExportFormat.PDF).generate({
      title: 'Report',
      generatedAt: new Date(),
      headers: [],
      rows: [],
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('NOT_IMPLEMENTED');
    expect(result.content).toBeUndefined();
  });
});
