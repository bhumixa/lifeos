import { CsvExportGenerator } from './csv-export.generator.js';

describe('CsvExportGenerator', () => {
  const generator = new CsvExportGenerator();

  it('joins headers and rows with commas', () => {
    const result = generator.generate({
      title: 'Report',
      generatedAt: new Date('2026-07-05T00:00:00Z'),
      headers: ['Bucket', 'Value'],
      rows: [
        ['2026-07-01', 5],
        ['2026-07-02', 3],
      ],
    });

    expect(result.success).toBe(true);
    expect(result.extension).toBe('csv');
    expect(result.content).toBe('Bucket,Value\n2026-07-01,5\n2026-07-02,3');
  });

  it('quotes a cell containing a comma, quote, or newline, doubling any internal quote', () => {
    const result = generator.generate({
      title: 'Report',
      generatedAt: new Date(),
      headers: ['Note'],
      rows: [['contains, a comma'], ['has a "quote"'], ['multi\nline']],
    });

    expect(result.content).toBe(
      'Note\n"contains, a comma"\n"has a ""quote"""\n"multi\nline"',
    );
  });
});
