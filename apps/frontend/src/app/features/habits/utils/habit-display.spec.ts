import { buildHeatmapCells, formatReminderTime, heatmapLevel, periodLabel, reminderIndicator } from './habit-display';

describe('formatReminderTime', () => {
  it('returns a non-empty formatted string preserving the minute value', () => {
    expect(formatReminderTime('08:05')).toContain('05');
    expect(formatReminderTime('00:00').length).toBeGreaterThan(0);
  });
});

describe('periodLabel', () => {
  it('maps each frequency to its display phrase', () => {
    expect(periodLabel('DAILY')).toBe('today');
    expect(periodLabel('WEEKLY')).toBe('this week');
    expect(periodLabel('MONTHLY')).toBe('this month');
  });
});

describe('heatmapLevel', () => {
  it('is 0 when nothing was completed', () => {
    expect(heatmapLevel(0, 8)).toBe(0);
  });

  it('buckets partial progress into levels 1-3', () => {
    expect(heatmapLevel(1, 8)).toBe(1); // 12.5%
    expect(heatmapLevel(3, 8)).toBe(2); // 37.5%
    expect(heatmapLevel(6, 8)).toBe(3); // 75%
  });

  it('is 4 once the target is met or exceeded', () => {
    expect(heatmapLevel(8, 8)).toBe(4);
    expect(heatmapLevel(12, 8)).toBe(4);
  });
});

describe('buildHeatmapCells', () => {
  it('produces exactly rangeDays cells ending today, oldest first', () => {
    const cells = buildHeatmapCells([], 1, 7);

    expect(cells.length).toBe(7);
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(cells[cells.length - 1].date).toBe(todayIso);
  });

  it('maps a matching log onto its date with the correct level', () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const cells = buildHeatmapCells([{ date: todayIso, completedCount: 2 }], 2, 7);

    const todayCell = cells.find((cell) => cell.date === todayIso);
    expect(todayCell?.completedCount).toBe(2);
    expect(todayCell?.level).toBe(4);
  });

  it('defaults unlogged days to a count of 0 and level 0', () => {
    const cells = buildHeatmapCells([], 5, 3);
    expect(cells.every((cell) => cell.completedCount === 0 && cell.level === 0)).toBe(true);
  });
});

describe('reminderIndicator', () => {
  it('returns null when there is no reminder time', () => {
    expect(reminderIndicator({ reminderTime: null, isActive: true })).toBeNull();
  });

  it('returns null for inactive habits even with a reminder time', () => {
    expect(reminderIndicator({ reminderTime: '08:00', isActive: false })).toBeNull();
  });

  it('returns a formatted time for active habits with a reminder', () => {
    expect(reminderIndicator({ reminderTime: '08:00', isActive: true })).not.toBeNull();
  });
});
