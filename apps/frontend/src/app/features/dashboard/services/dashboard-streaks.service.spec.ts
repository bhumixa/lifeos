import { TestBed } from '@angular/core/testing';
import type { Achievement, StreaksStatistics } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { StreaksApiService } from '../../streaks/services/streaks-api.service';
import { DashboardStreaksService } from './dashboard-streaks.service';

describe('DashboardStreaksService', () => {
  let service: DashboardStreaksService;
  let streaksApi: { statistics: jasmine.Spy; unlockedAchievements: jasmine.Spy };

  const statistics: StreaksStatistics = {
    hasDailyHabits: true,
    currentStreak: 5,
    longestStreak: 12,
    weeklyConsistency: 86,
    monthlyConsistency: 73,
    successRate: 91,
    isPerfectWeek: false,
    isPerfectMonth: false,
    xpEarned: 240,
    totals: { tasksCompleted: 3, habitCompletions: 20, routineCompletions: 4, perfectDays: 2 },
    freezeDays: { usedThisMonth: 0, remainingThisMonth: 2, monthlyQuota: 2 },
    dailyHistory: [],
  };

  const unlocked: Achievement[] = [
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
      statistics: jasmine.createSpy('statistics'),
      unlockedAchievements: jasmine.createSpy('unlockedAchievements'),
    };
    TestBed.configureTestingModule({ providers: [{ provide: StreaksApiService, useValue: streaksApi }] });
    service = TestBed.inject(DashboardStreaksService);
  });

  it('combines statistics and unlocked-achievement count into a flat summary', (done) => {
    streaksApi.statistics.and.returnValue(of(statistics));
    streaksApi.unlockedAchievements.and.returnValue(of(unlocked));

    service.load().subscribe((summary) => {
      expect(summary).toEqual({
        currentStreak: 5,
        longestStreak: 12,
        xpEarned: 240,
        achievementsUnlockedCount: 1,
        weeklyConsistency: 86,
        monthlyConsistency: 73,
        successRate: 91,
      });
      done();
    });
  });
});
