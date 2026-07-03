import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { StreaksApiService } from './streaks-api.service';

describe('StreaksApiService', () => {
  let service: StreaksApiService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StreaksApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('overview() requests GET /streaks', () => {
    service.overview().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/streaks`);
    expect(req.request.method).toBe('GET');
    req.flush({ hasDailyHabits: false, currentStreak: 0, longestStreak: 0, habits: [] });
  });

  it('today() requests GET /streaks/today', () => {
    service.today().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/streaks/today`);
    expect(req.request.method).toBe('GET');
    req.flush({
      date: '2026-07-03',
      hasDailyHabits: false,
      totalDailyHabits: 0,
      completedDailyHabits: 0,
      remainingHabitIds: [],
      isTodaySuccessful: false,
      isFrozenToday: false,
      freezesRemainingThisMonth: 2,
    });
  });

  it('statistics() requests GET /streaks/statistics', () => {
    service.statistics().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/streaks/statistics`);
    expect(req.request.method).toBe('GET');
    req.flush({
      hasDailyHabits: false,
      currentStreak: 0,
      longestStreak: 0,
      weeklyConsistency: 0,
      monthlyConsistency: 0,
      successRate: 0,
      isPerfectWeek: false,
      isPerfectMonth: false,
      xpEarned: 0,
      totals: { tasksCompleted: 0, habitCompletions: 0, routineCompletions: 0, perfectDays: 0 },
      freezeDays: { usedThisMonth: 0, remainingThisMonth: 2, monthlyQuota: 2 },
      dailyHistory: [],
    });
  });

  it('habitStreak() requests the specific habit sub-resource', () => {
    service.habitStreak('habit-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/streaks/habits/habit-1`);
    expect(req.request.method).toBe('GET');
    req.flush({
      habitId: 'habit-1',
      name: 'Drink water',
      icon: 'local_drink',
      color: '#03A9F4',
      targetFrequency: 'DAILY',
      targetCount: 1,
      currentStreak: 0,
      longestStreak: 0,
      currentPeriodCount: 0,
      currentPeriodMet: false,
      history: [],
    });
  });

  it('achievements() requests GET /achievements', () => {
    service.achievements().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/achievements`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('unlockedAchievements() requests GET /achievements/unlocked', () => {
    service.unlockedAchievements().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/achievements/unlocked`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('useFreezeDay() posts to /freeze-days/use with the given body', () => {
    service.useFreezeDay({ date: '2026-07-02' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/freeze-days/use`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-07-02' });
    req.flush({
      date: '2026-07-03',
      usedThisMonth: 1,
      remainingThisMonth: 1,
      monthlyQuota: 2,
      isDateFrozen: false,
    });
  });
});
