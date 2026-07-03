import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Achievement,
  FreezeDayStatus,
  HabitStreakDetail,
  StreaksOverview,
  StreaksStatistics,
  StreaksToday,
  UseFreezeDayRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's StreaksStore's job), following the
 * same shape as HabitApiService/PlannerApiService. Covers all three of the Streak Engine's route
 * prefixes (/streaks, /achievements, /freeze-days) in one service since they're one conceptual
 * feature on the frontend, the same way the backend's StreaksModule groups all three controllers
 * together. */
@Injectable({ providedIn: 'root' })
export class StreaksApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  overview(): Observable<StreaksOverview> {
    return this.http.get<StreaksOverview>(`${this.baseUrl}/streaks`);
  }

  today(): Observable<StreaksToday> {
    return this.http.get<StreaksToday>(`${this.baseUrl}/streaks/today`);
  }

  statistics(): Observable<StreaksStatistics> {
    return this.http.get<StreaksStatistics>(`${this.baseUrl}/streaks/statistics`);
  }

  habitStreak(habitId: string): Observable<HabitStreakDetail> {
    return this.http.get<HabitStreakDetail>(`${this.baseUrl}/streaks/habits/${habitId}`);
  }

  achievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.baseUrl}/achievements`);
  }

  unlockedAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.baseUrl}/achievements/unlocked`);
  }

  useFreezeDay(request: UseFreezeDayRequest): Observable<FreezeDayStatus> {
    return this.http.post<FreezeDayStatus>(`${this.baseUrl}/freeze-days/use`, request);
  }
}
