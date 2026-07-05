import {
  bucketDatedValues,
  buildCompletionPoints,
  percentageOf,
  previousRangeOf,
  resolvePeriodRange,
  windowLengthDays,
  type DatedValue,
} from './analytics-bucket.util.js';

describe('resolvePeriodRange', () => {
  it('DAY is a single-day, day-granularity range', () => {
    expect(resolvePeriodRange('DAY', '2026-07-05')).toEqual({
      from: '2026-07-05',
      to: '2026-07-05',
      granularity: 'DAY',
    });
  });

  it('WEEK spans the trailing 7 days at day granularity', () => {
    expect(resolvePeriodRange('WEEK', '2026-07-05')).toEqual({
      from: '2026-06-29',
      to: '2026-07-05',
      granularity: 'DAY',
    });
  });

  it('MONTH spans the trailing 30 days at week granularity', () => {
    const range = resolvePeriodRange('MONTH', '2026-07-05');
    expect(range.granularity).toBe('WEEK');
    expect(range.from).toBe('2026-06-06');
    expect(range.to).toBe('2026-07-05');
  });

  it('YEAR spans the trailing 365 days at month granularity', () => {
    const range = resolvePeriodRange('YEAR', '2026-07-05');
    expect(range.granularity).toBe('MONTH');
    expect(range.from).toBe('2025-07-06');
    expect(range.to).toBe('2026-07-05');
  });
});

describe('windowLengthDays / previousRangeOf', () => {
  it('windowLengthDays is inclusive of both endpoints', () => {
    expect(windowLengthDays({ from: '2026-07-01', to: '2026-07-07' })).toBe(7);
    expect(windowLengthDays({ from: '2026-07-05', to: '2026-07-05' })).toBe(1);
  });

  it('previousRangeOf returns the equally-sized window immediately before', () => {
    expect(previousRangeOf({ from: '2026-06-29', to: '2026-07-05' })).toEqual({
      from: '2026-06-22',
      to: '2026-06-28',
    });
  });
});

describe('percentageOf', () => {
  it('rounds to the nearest whole percent', () => {
    expect(percentageOf(1, 3)).toBe(33);
    expect(percentageOf(2, 3)).toBe(67);
  });

  it('returns 0 rather than dividing by zero when total is 0', () => {
    expect(percentageOf(0, 0)).toBe(0);
  });
});

describe('bucketDatedValues', () => {
  it('zero-fills every day in range at DAY granularity, not just days with data', () => {
    const values: DatedValue[] = [{ date: '2026-07-03', value: 2, total: 4 }];
    const result = bucketDatedValues(values, '2026-07-01', '2026-07-03', 'DAY');

    expect(result).toEqual([
      { bucket: '2026-07-01', value: 0 },
      { bucket: '2026-07-02', value: 0 },
      { bucket: '2026-07-03', value: 2, total: 4 },
    ]);
  });

  it('groups into 7-day buckets anchored at `from` for WEEK granularity', () => {
    const values: DatedValue[] = [
      { date: '2026-06-06', value: 1 },
      { date: '2026-06-10', value: 1 },
      { date: '2026-06-13', value: 1 },
    ];
    const result = bucketDatedValues(
      values,
      '2026-06-06',
      '2026-06-19',
      'WEEK',
    );

    expect(result).toEqual([
      { bucket: '2026-06-06', value: 2 },
      { bucket: '2026-06-13', value: 1 },
    ]);
  });

  it('groups by calendar month for MONTH granularity', () => {
    const values: DatedValue[] = [
      { date: '2026-01-15', value: 1 },
      { date: '2026-02-01', value: 3 },
    ];
    const result = bucketDatedValues(
      values,
      '2026-01-01',
      '2026-02-28',
      'MONTH',
    );

    expect(result).toEqual([
      { bucket: '2026-01', value: 1 },
      { bucket: '2026-02', value: 3 },
    ]);
  });

  it('sums total across values sharing the same bucket', () => {
    const values: DatedValue[] = [
      { date: '2026-07-01', value: 1, total: 2 },
      { date: '2026-07-01', value: 1, total: 1 },
    ];
    const result = bucketDatedValues(values, '2026-07-01', '2026-07-01', 'DAY');
    expect(result).toEqual([{ bucket: '2026-07-01', value: 2, total: 3 }]);
  });
});

describe('buildCompletionPoints', () => {
  it('pairs opportunities with completions on the same date', () => {
    const totalDates = [
      new Date('2026-07-01T08:00:00Z'),
      new Date('2026-07-01T09:00:00Z'),
    ];
    const completedDates = [new Date('2026-07-01T10:00:00Z')];

    expect(buildCompletionPoints(totalDates, completedDates)).toEqual([
      { date: '2026-07-01', value: 1, total: 2 },
    ]);
  });

  it('never lets total fall below value when a completion has no matching opportunity row', () => {
    const result = buildCompletionPoints(
      [],
      [new Date('2026-07-01T10:00:00Z')],
    );
    expect(result).toEqual([{ date: '2026-07-01', value: 1, total: 1 }]);
  });
});
