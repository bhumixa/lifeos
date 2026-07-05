import {
  bestWeekdaysByCount,
  computeConfidence,
  computeGoalRisk,
  computeMoodTrend,
  moodScore,
  weekOverWeekCompletionRate,
  type DailyCompletionPoint,
} from './ai-metrics.util.js';

describe('weekOverWeekCompletionRate', () => {
  it('computes a negative delta when this week is worse than last week', () => {
    const points: DailyCompletionPoint[] = [
      // last week (7 days ago through 13 days ago): 100% completion
      { date: '2026-06-27', completed: 5, total: 5 },
      // this week (today through 6 days ago): 50% completion
      { date: '2026-07-04', completed: 2, total: 4 },
    ];

    const result = weekOverWeekCompletionRate(points, '2026-07-04');

    expect(result.completionRateLastWeek).toBe(100);
    expect(result.completionRateThisWeek).toBe(50);
    expect(result.deltaPercent).toBe(-50);
  });

  it('returns 0% for a week with no data at all, not a division error', () => {
    const result = weekOverWeekCompletionRate([], '2026-07-04');
    expect(result).toEqual({
      completionRateThisWeek: 0,
      completionRateLastWeek: 0,
      deltaPercent: 0,
    });
  });
});

describe('bestWeekdaysByCount', () => {
  it('returns every weekday tied for the highest count', () => {
    // 2026-07-06 and 2026-07-07 are both Mondays/Tuesdays in the same week; use two distinct
    // Tuesdays to build a real tie.
    const dates = [
      '2026-07-07', // Tuesday
      '2026-07-14', // Tuesday
      '2026-07-08', // Wednesday
      '2026-07-15', // Wednesday
      '2026-07-09', // Thursday (only once)
    ];

    expect(bestWeekdaysByCount(dates)).toEqual(['Tuesday', 'Wednesday']);
  });

  it('returns an empty array for no dates', () => {
    expect(bestWeekdaysByCount([])).toEqual([]);
  });
});

describe('computeConfidence', () => {
  it('scales linearly with how much of the target window has data', () => {
    expect(computeConfidence(7, 14)).toBe(0.5);
    expect(computeConfidence(14, 14)).toBe(1);
    expect(computeConfidence(0, 14)).toBe(0);
  });

  it('clamps above the target window rather than exceeding 1', () => {
    expect(computeConfidence(30, 14)).toBe(1);
  });
});

describe('moodScore', () => {
  it('maps every Mood value to its 1-5 scale', () => {
    expect(moodScore('VERY_BAD')).toBe(1);
    expect(moodScore('EXCELLENT')).toBe(5);
  });

  it('returns null for no mood recorded, never defaulting to a middle value', () => {
    expect(moodScore(null)).toBeNull();
  });
});

describe('computeMoodTrend', () => {
  it('detects an improving run of at least 3 consecutive days', () => {
    // Newest first: 5,5,4,3,2 — improving (non-decreasing forward in time) for 5 entries.
    expect(computeMoodTrend([5, 5, 4, 3, 2])).toEqual({
      direction: 'IMPROVING',
      consecutiveDays: 5,
    });
  });

  it('detects a declining run of at least 3 consecutive days', () => {
    // Newest first: 1,2,3 — declining forward in time for 3 entries.
    expect(computeMoodTrend([1, 2, 3])).toEqual({
      direction: 'DECLINING',
      consecutiveDays: 3,
    });
  });

  it('reports STABLE for a run shorter than 3 days', () => {
    expect(computeMoodTrend([5, 3])).toEqual({
      direction: 'STABLE',
      consecutiveDays: 2,
    });
  });

  it('reports STABLE with 0 days for no data', () => {
    expect(computeMoodTrend([])).toEqual({
      direction: 'STABLE',
      consecutiveDays: 0,
    });
  });
});

describe('computeGoalRisk', () => {
  it('flags a goal as at-risk when it is behind its expected schedule', () => {
    // 100 days total, 50 elapsed (50% expected), only 10% actual — well behind.
    const risk = computeGoalRisk('2026-01-01', '2026-04-11', 10, '2026-02-20');
    expect(risk.expectedPercent).toBeGreaterThan(40);
    expect(risk.atRisk).toBe(true);
  });

  it('does not flag a goal that is on or ahead of schedule', () => {
    const risk = computeGoalRisk('2026-01-01', '2026-04-11', 90, '2026-02-20');
    expect(risk.atRisk).toBe(false);
  });

  it('flags a goal past its target date that is still incomplete', () => {
    const risk = computeGoalRisk('2026-01-01', '2026-02-01', 80, '2026-03-01');
    expect(risk.atRisk).toBe(true);
  });
});
