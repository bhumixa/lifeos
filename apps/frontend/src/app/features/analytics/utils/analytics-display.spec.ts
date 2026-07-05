import {
  formatDeltaPercent,
  formatMinutes,
  moodTrendLabel,
  periodLabel,
  reportTypeLabel,
  scoreLevel,
} from './analytics-display';

describe('periodLabel', () => {
  it('maps every AnalyticsPeriod to a display label', () => {
    expect(periodLabel('DAY')).toBe('Day');
    expect(periodLabel('WEEK')).toBe('Week');
    expect(periodLabel('MONTH')).toBe('Month');
    expect(periodLabel('YEAR')).toBe('Year');
  });
});

describe('reportTypeLabel', () => {
  it('maps every known AnalyticsReportType to a display label', () => {
    expect(reportTypeLabel('OVERVIEW')).toBe('Overview');
    expect(reportTypeLabel('PRODUCTIVITY')).toBe('Productivity');
  });

  it('falls back to the raw string for an unrecognized value', () => {
    expect(reportTypeLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('scoreLevel', () => {
  it('buckets 70+ as high, 40-69 as medium, below 40 as low', () => {
    expect(scoreLevel(85)).toBe('high');
    expect(scoreLevel(70)).toBe('high');
    expect(scoreLevel(69)).toBe('medium');
    expect(scoreLevel(40)).toBe('medium');
    expect(scoreLevel(39)).toBe('low');
    expect(scoreLevel(0)).toBe('low');
  });
});

describe('formatMinutes', () => {
  it('formats sub-hour durations as plain minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('formats whole-hour durations without a minutes suffix', () => {
    expect(formatMinutes(120)).toBe('2h');
  });

  it('formats mixed durations as both', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });
});

describe('formatDeltaPercent', () => {
  it('prefixes a positive delta with +', () => {
    expect(formatDeltaPercent(8)).toBe('+8%');
  });

  it('leaves a negative delta as-is', () => {
    expect(formatDeltaPercent(-12)).toBe('-12%');
  });

  it('renders exactly 0 with no sign', () => {
    expect(formatDeltaPercent(0)).toBe('0%');
  });
});

describe('moodTrendLabel', () => {
  it('maps every MoodTrendDirection to a display label', () => {
    expect(moodTrendLabel('IMPROVING')).toBe('Improving');
    expect(moodTrendLabel('DECLINING')).toBe('Declining');
    expect(moodTrendLabel('STABLE')).toBe('Stable');
  });
});
