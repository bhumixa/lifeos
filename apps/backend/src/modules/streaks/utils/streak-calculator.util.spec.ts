import {
  buildDailySuccessHistory,
  buildPeriodHistory,
  computeConsistencyPercent,
  computeCurrentStreak,
  computeLongestStreak,
  computeSuccessRate,
  isPerfectMonth,
  isPerfectWeek,
  nextMonthStart,
  previousMonthStart,
  startOfMonth,
  startOfWeek,
  toDailySuccessLike,
  type DailyHabitDefinition,
  type DailyHabitLog,
} from './streak-calculator.util.js';

const HABIT_A: DailyHabitDefinition = {
  id: 'habit-a',
  targetCount: 1,
  createdAtDateStr: '2026-01-01',
};

function log(habitId: string, date: string, completedCount = 1): DailyHabitLog {
  return { habitId, date, completedCount };
}

describe('buildDailySuccessHistory', () => {
  it('marks a day successful only when every existing daily habit met its targetCount', () => {
    const habitB: DailyHabitDefinition = {
      id: 'habit-b',
      targetCount: 8,
      createdAtDateStr: '2026-01-01',
    };
    const history = buildDailySuccessHistory(
      [HABIT_A, habitB],
      [log('habit-a', '2026-01-01'), log('habit-b', '2026-01-01', 8)],
      new Set(),
      '2026-01-01',
      '2026-01-01',
    );

    expect(history).toEqual([
      {
        date: '2026-01-01',
        completedCount: 2,
        totalCount: 2,
        frozen: false,
        successful: true,
      },
    ]);
  });

  it('fails a day when a habit fell short of its targetCount', () => {
    const habitB: DailyHabitDefinition = {
      id: 'habit-b',
      targetCount: 8,
      createdAtDateStr: '2026-01-01',
    };
    const history = buildDailySuccessHistory(
      [HABIT_A, habitB],
      [log('habit-a', '2026-01-01'), log('habit-b', '2026-01-01', 3)],
      new Set(),
      '2026-01-01',
      '2026-01-01',
    );

    expect(history[0].successful).toBe(false);
    expect(history[0].completedCount).toBe(1);
    expect(history[0].totalCount).toBe(2);
  });

  it('does not require a habit on days before it was created', () => {
    const lateHabit: DailyHabitDefinition = {
      id: 'habit-late',
      targetCount: 1,
      createdAtDateStr: '2026-01-05',
    };
    const history = buildDailySuccessHistory(
      [HABIT_A, lateHabit],
      [log('habit-a', '2026-01-02')],
      new Set(),
      '2026-01-02',
      '2026-01-02',
    );

    // Only habit-a existed on 2026-01-02; habit-late doesn't count toward that day's total.
    expect(history[0]).toEqual({
      date: '2026-01-02',
      completedCount: 1,
      totalCount: 1,
      frozen: false,
      successful: true,
    });
  });

  it('a frozen day is successful even with zero completions', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [],
      new Set(['2026-01-03']),
      '2026-01-03',
      '2026-01-03',
    );

    expect(history[0].successful).toBe(true);
    expect(history[0].frozen).toBe(true);
    expect(history[0].completedCount).toBe(0);
  });

  it('walks every calendar day across a leap-year February without skipping or duplicating Feb 29', () => {
    const history = buildDailySuccessHistory(
      [{ ...HABIT_A, createdAtDateStr: '2026-01-01' }],
      [],
      new Set(),
      '2028-02-27',
      '2028-03-01',
    );

    // 2028 is a leap year — Feb has 29 days.
    expect(history.map((day) => day.date)).toEqual([
      '2028-02-27',
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('walks every calendar day across a non-leap-year February (no Feb 29)', () => {
    const history = buildDailySuccessHistory(
      [{ ...HABIT_A, createdAtDateStr: '2026-01-01' }],
      [],
      new Set(),
      '2026-02-27',
      '2026-03-01',
    );

    expect(history.map((day) => day.date)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });

  it('walks across a DST spring-forward date as a single calendar day, unaffected by the clock change', () => {
    // 2026-03-08 is America/New_York's spring-forward day; calendar-date arithmetic here is
    // timezone-agnostic (the caller is responsible for producing "YYYY-MM-DD" already resolved to
    // the user's zone), so this must still produce exactly one entry for the transition date.
    const history = buildDailySuccessHistory(
      [{ ...HABIT_A, createdAtDateStr: '2026-01-01' }],
      [],
      new Set(),
      '2026-03-07',
      '2026-03-09',
    );

    expect(history.map((day) => day.date)).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
  });
});

describe('computeCurrentStreak', () => {
  function historyFor(
    successfulByDate: Record<string, boolean>,
  ): ReturnType<typeof buildDailySuccessHistory> {
    return Object.entries(successfulByDate).map(([date, successful]) => ({
      date,
      completedCount: successful ? 1 : 0,
      totalCount: 1,
      frozen: false,
      successful,
    }));
  }

  it('counts consecutive successful days ending today', () => {
    const history = historyFor({
      '2026-06-30': true,
      '2026-07-01': true,
      '2026-07-02': true,
      '2026-07-03': true,
    });
    expect(computeCurrentStreak(history, '2026-07-03')).toBe(4);
  });

  it('stops at the first unsuccessful day walking backward', () => {
    const history = historyFor({
      '2026-06-30': true,
      '2026-07-01': false,
      '2026-07-02': true,
      '2026-07-03': true,
    });
    expect(computeCurrentStreak(history, '2026-07-03')).toBe(2);
  });

  it('grants a same-day grace when today is not yet successful, continuing through yesterday', () => {
    const history = historyFor({
      '2026-07-01': true,
      '2026-07-02': true,
      '2026-07-03': false,
    });
    expect(computeCurrentStreak(history, '2026-07-03')).toBe(2);
  });

  it('is zero when yesterday was already a miss, even with today ungraced', () => {
    const history = historyFor({
      '2026-07-01': true,
      '2026-07-02': false,
      '2026-07-03': false,
    });
    expect(computeCurrentStreak(history, '2026-07-03')).toBe(0);
  });
});

describe('computeLongestStreak', () => {
  it('finds the longest run anywhere in history, not just the trailing one', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [
        log('habit-a', '2026-01-01'),
        log('habit-a', '2026-01-02'),
        log('habit-a', '2026-01-03'),
        // 2026-01-04 missing -> breaks the run
        log('habit-a', '2026-01-05'),
      ],
      new Set(),
      '2026-01-01',
      '2026-01-05',
    );
    expect(computeLongestStreak(history)).toBe(3);
  });

  it('gives no same-day grace, unlike computeCurrentStreak', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [log('habit-a', '2026-01-01'), log('habit-a', '2026-01-02')],
      new Set(),
      '2026-01-01',
      '2026-01-03',
    );
    // 2026-01-03 has no log -> not successful -> longest run is the first two days only.
    expect(computeLongestStreak(history)).toBe(2);
  });
});

describe('computeConsistencyPercent', () => {
  it('computes the percentage of the trailing window that was successful', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [log('habit-a', '2026-01-01'), log('habit-a', '2026-01-02')],
      new Set(),
      '2026-01-01',
      '2026-01-04',
    );
    // 2 of the last 4 days successful.
    expect(computeConsistencyPercent(history, 4)).toBe(50);
  });

  it('returns 0 for an empty history', () => {
    expect(computeConsistencyPercent([], 7)).toBe(0);
  });
});

describe('computeSuccessRate', () => {
  it('rates the entire supplied history, not a fixed window', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [log('habit-a', '2026-01-01')],
      new Set(),
      '2026-01-01',
      '2026-01-03',
    );
    expect(computeSuccessRate(history)).toBe(33);
  });
});

describe('startOfWeek / startOfMonth', () => {
  it('resolves Monday of the containing week', () => {
    // 2026-07-03 is a Friday.
    expect(startOfWeek('2026-07-03')).toBe('2026-06-29');
  });

  it('is a no-op when the date is already a Monday', () => {
    expect(startOfWeek('2026-06-29')).toBe('2026-06-29');
  });

  it('resolves the 1st of the containing month', () => {
    expect(startOfMonth('2026-07-17')).toBe('2026-07-01');
  });
});

describe('isPerfectWeek / isPerfectMonth', () => {
  it('is true only when every day from the boundary through today succeeded', () => {
    // 2026-07-03 is a Friday; Monday is 2026-06-29.
    const history = buildDailySuccessHistory(
      [HABIT_A],
      [
        '2026-06-29',
        '2026-06-30',
        '2026-07-01',
        '2026-07-02',
        '2026-07-03',
      ].map((d) => log('habit-a', d)),
      new Set(),
      '2026-06-29',
      '2026-07-03',
    );
    expect(isPerfectWeek(history, '2026-07-03')).toBe(true);
  });

  it('is false if any day since the boundary was missed', () => {
    const history = buildDailySuccessHistory(
      [HABIT_A],
      ['2026-06-29', '2026-07-01', '2026-07-02', '2026-07-03'].map((d) =>
        log('habit-a', d),
      ),
      new Set(),
      '2026-06-29',
      '2026-07-03',
    );
    // 2026-06-30 has no log -> not successful.
    expect(isPerfectWeek(history, '2026-07-03')).toBe(false);
  });

  it('perfect month requires every day since the 1st, spanning a leap-year February', () => {
    const dates: string[] = [];
    for (let day = 1; day <= 29; day++) {
      dates.push(`2028-02-${String(day).padStart(2, '0')}`);
    }
    const history = buildDailySuccessHistory(
      [{ ...HABIT_A, createdAtDateStr: '2028-01-01' }],
      dates.map((d) => log('habit-a', d)),
      new Set(),
      '2028-02-01',
      '2028-02-29',
    );
    expect(isPerfectMonth(history, '2028-02-29')).toBe(true);
  });
});

describe('nextMonthStart / previousMonthStart', () => {
  it('rolls forward across a year boundary', () => {
    expect(nextMonthStart('2026-12-15')).toBe('2027-01-01');
  });

  it('rolls backward across a year boundary', () => {
    expect(previousMonthStart('2027-01-15')).toBe('2026-12-01');
  });

  it('rolls forward out of a leap-year February correctly', () => {
    expect(nextMonthStart('2028-02-10')).toBe('2028-03-01');
  });
});

describe('buildPeriodHistory / toDailySuccessLike', () => {
  it('sums completedCount within each period window and checks it against targetCount', () => {
    const logs = [
      { date: '2026-06-29', completedCount: 2 },
      { date: '2026-07-01', completedCount: 1 },
      { date: '2026-07-06', completedCount: 5 }, // falls in the next week, excluded
    ];
    const periods = buildPeriodHistory(logs, 3, ['2026-06-29'], (start) =>
      // exclusive end = start + 7 days
      new Date(new Date(`${start}T00:00:00.000Z`).getTime() + 7 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );

    expect(periods).toEqual([
      { periodStart: '2026-06-29', completedCount: 3, met: true },
    ]);
  });

  it('adapts periods into the current/longest-streak walk via toDailySuccessLike', () => {
    const periods = [
      { periodStart: '2026-05-01', completedCount: 3, met: true },
      { periodStart: '2026-06-01', completedCount: 3, met: true },
      { periodStart: '2026-07-01', completedCount: 0, met: false },
    ];
    const adapted = toDailySuccessLike(periods);
    expect(computeLongestStreak(adapted)).toBe(2);
    // Same-period grace: the current (not-yet-met) period doesn't zero the streak.
    expect(computeCurrentStreak(adapted, '2026-07-01')).toBe(2);
  });
});
