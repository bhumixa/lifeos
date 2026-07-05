import { JsonExportGenerator } from './json-export.generator.js';

describe('JsonExportGenerator', () => {
  const generator = new JsonExportGenerator();

  it('serializes title/period/headers/rows/summary as structured JSON', () => {
    const generatedAt = new Date('2026-07-05T12:00:00Z');
    const result = generator.generate({
      title: 'Productivity Report',
      generatedAt,
      period: 'WEEK (2026-06-29 to 2026-07-05)',
      headers: ['Bucket', 'Value'],
      rows: [['2026-07-05', 4]],
      summary: { averageCompletionRate: 80 },
    });

    expect(result.success).toBe(true);
    expect(result.extension).toBe('json');
    expect(JSON.parse(result.content!)).toEqual({
      title: 'Productivity Report',
      generatedAt: generatedAt.toISOString(),
      period: 'WEEK (2026-06-29 to 2026-07-05)',
      headers: ['Bucket', 'Value'],
      rows: [['2026-07-05', 4]],
      summary: { averageCompletionRate: 80 },
    });
  });

  it('defaults period/summary to null when omitted (e.g. the OVERVIEW report)', () => {
    const result = generator.generate({
      title: 'Overview Report',
      generatedAt: new Date(),
      headers: ['Metric', 'Value'],
      rows: [['Productivity Score', 70]],
    });

    const parsed = JSON.parse(result.content!) as {
      period: unknown;
      summary: unknown;
    };
    expect(parsed.period).toBeNull();
    expect(parsed.summary).toBeNull();
  });
});
