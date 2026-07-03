import { TestBed } from '@angular/core/testing';
import type { Achievement, StreaksStatistics } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { StreaksApiService } from '../services/streaks-api.service';
import { StreaksStore } from './streaks-store';

describe('StreaksStore', () => {
  let store: StreaksStore;
  let streaksApi: {
    statistics: jasmine.Spy;
    achievements: jasmine.Spy;
    useFreezeDay: jasmine.Spy;
  };

  const mockStatistics: StreaksStatistics = {
    hasDailyHabits: true,
    currentStreak: 4,
    longestStreak: 10,
    weeklyConsistency: 80,
    monthlyConsistency: 70,
    successRate: 75,
    isPerfectWeek: false,
    isPerfectMonth: false,
    xpEarned: 150,
    totals: { tasksCompleted: 2, habitCompletions: 15, routineCompletions: 3, perfectDays: 4 },
    freezeDays: { usedThisMonth: 1, remainingThisMonth: 1, monthlyQuota: 2 },
    dailyHistory: [],
  };

  const mockAchievements: Achievement[] = [
    {
      id: 'a1',
      code: 'FIRST_HABIT',
      title: 'First Habit',
      description: 'desc',
      icon: 'flag',
      xpReward: 10,
      unlocked: true,
      unlockedAt: '2026-07-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    streaksApi = {
      statistics: jasmine.createSpy('statistics').and.returnValue(of(mockStatistics)),
      achievements: jasmine.createSpy('achievements').and.returnValue(of(mockAchievements)),
      useFreezeDay: jasmine.createSpy('useFreezeDay').and.returnValue(
        of({ date: '2026-07-03', usedThisMonth: 2, remainingThisMonth: 0, monthlyQuota: 2, isDateFrozen: true }),
      ),
    };

    TestBed.configureTestingModule({ providers: [{ provide: StreaksApiService, useValue: streaksApi }] });
    store = TestBed.inject(StreaksStore);
  });

  it('starts with no data loaded and loading false', () => {
    expect(store.statistics()).toBeNull();
    expect(store.achievements()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('load() populates statistics and achievements together', () => {
    store.load();

    expect(store.statistics()).toEqual(mockStatistics);
    expect(store.achievements()).toEqual(mockAchievements);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message and clears loading on failure', () => {
    streaksApi.statistics.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load streak data. Please try again.');
    expect(store.loading()).toBe(false);
  });

  it('useFreezeDay() delegates to the API and reloads afterward', () => {
    store.useFreezeDay({ date: '2026-07-02' }).subscribe();

    expect(streaksApi.useFreezeDay).toHaveBeenCalledWith({ date: '2026-07-02' });
    // Reload triggered as a side effect.
    expect(streaksApi.statistics).toHaveBeenCalled();
    expect(streaksApi.achievements).toHaveBeenCalled();
  });
});
