import type { DailyHistoryEntry } from '@lifeos/shared-types';
import { consistencyLabel, formatXp, toHeatmapCells } from './streak-display';

describe('toHeatmapCells', () => {
  it('grades a day by completedCount over totalCount, same as a single habit heatmap cell', () => {
    const history: DailyHistoryEntry[] = [
      { date: '2026-07-01', completedCount: 0, totalCount: 2, successful: false },
      { date: '2026-07-02', completedCount: 1, totalCount: 2, successful: false },
      { date: '2026-07-03', completedCount: 2, totalCount: 2, successful: true },
    ];

    const cells = toHeatmapCells(history);

    expect(cells).toEqual([
      { date: '2026-07-01', completedCount: 0, level: 0 },
      { date: '2026-07-02', completedCount: 1, level: 2 },
      { date: '2026-07-03', completedCount: 2, level: 4 },
    ]);
  });

  it('does not divide by zero when a day has no daily habits at all', () => {
    const history: DailyHistoryEntry[] = [{ date: '2026-07-01', completedCount: 0, totalCount: 0, successful: false }];

    expect(() => toHeatmapCells(history)).not.toThrow();
    expect(toHeatmapCells(history)[0].level).toBe(0);
  });
});

describe('formatXp', () => {
  it('appends the XP unit and groups thousands', () => {
    expect(formatXp(0)).toBe('0 XP');
    expect(formatXp(1500)).toBe('1,500 XP');
  });
});

describe('consistencyLabel', () => {
  it('buckets percentages into qualitative labels', () => {
    expect(consistencyLabel(95)).toBe('Excellent');
    expect(consistencyLabel(75)).toBe('Good');
    expect(consistencyLabel(50)).toBe('Fair');
    expect(consistencyLabel(10)).toBe('Needs work');
  });

  it('is inclusive at each threshold boundary', () => {
    expect(consistencyLabel(90)).toBe('Excellent');
    expect(consistencyLabel(70)).toBe('Good');
    expect(consistencyLabel(40)).toBe('Fair');
  });
});
