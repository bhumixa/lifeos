import {
  completionRate,
  computeGoalScore,
  computeJournalScore,
  computeProductivityScore,
} from './analytics-scoring.util.js';

describe('completionRate', () => {
  it('rounds completed/total to a whole percent', () => {
    expect(completionRate(1, 4)).toBe(25);
  });

  it('returns 0, not NaN, when there is nothing to complete', () => {
    expect(completionRate(0, 0)).toBe(0);
  });
});

describe('computeProductivityScore', () => {
  it('averages the three domain rates', () => {
    expect(computeProductivityScore(100, 50, 0)).toBe(50);
  });

  it('is 0 when every domain rate is 0', () => {
    expect(computeProductivityScore(0, 0, 0)).toBe(0);
  });
});

describe('computeGoalScore', () => {
  it('averages progressPercent across active goals', () => {
    expect(
      computeGoalScore([{ progressPercent: 20 }, { progressPercent: 60 }]),
    ).toBe(40);
  });

  it('returns 0 for a user with no active goals, not a division error', () => {
    expect(computeGoalScore([])).toBe(0);
  });
});

describe('computeJournalScore', () => {
  it('is the percentage of the window with at least one entry', () => {
    expect(computeJournalScore(3, 7)).toBe(43);
  });

  it('is 0 for a brand-new window with no entries yet', () => {
    expect(computeJournalScore(0, 7)).toBe(0);
  });
});
