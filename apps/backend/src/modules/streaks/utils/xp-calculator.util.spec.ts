import { computeTotalXp } from './xp-calculator.util.js';

describe('computeTotalXp', () => {
  it('sums each category at its own per-event XP value', () => {
    const xp = computeTotalXp({
      tasksCompleted: 2,
      habitCompletions: 3,
      routineCompletions: 1,
      perfectDays: 1,
    });
    // 2*10 + 3*5 + 1*15 + 1*50 = 20 + 15 + 15 + 50 = 100
    expect(xp).toBe(100);
  });

  it('is zero when nothing has been completed', () => {
    expect(
      computeTotalXp({
        tasksCompleted: 0,
        habitCompletions: 0,
        routineCompletions: 0,
        perfectDays: 0,
      }),
    ).toBe(0);
  });
});
