import { Injectable, signal } from '@angular/core';
import type { AnalyticsPeriod } from '@lifeos/shared-types';

/**
 * The one piece of state genuinely shared across this feature's pages — the currently selected
 * chart period (Day/Week/Month/Year), set via TimeRangePicker on the Analytics Dashboard and
 * Reports pages. `providedIn: 'root'` like NotificationsStore, for the same reason: more than one
 * component on the same page (every chart card) reads it at once, so a change from the picker
 * must reflow every chart without each one owning its own copy. Unlike GoalsStore/NotificationsStore
 * this holds no fetched data of its own — every page still calls AnalyticsApiService directly for
 * its own domain's data, this store is only the shared "what period is currently selected" signal.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsPeriodStore {
  private readonly periodSignal = signal<AnalyticsPeriod>('WEEK');

  readonly period = this.periodSignal.asReadonly();

  setPeriod(period: AnalyticsPeriod): void {
    this.periodSignal.set(period);
  }
}
