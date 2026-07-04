import { Injectable, inject } from '@angular/core';
import type { Mood } from '@lifeos/shared-types';
import { forkJoin, map, type Observable } from 'rxjs';
import { JournalApiService } from '../../journal/services/journal-api.service';
import { entryHeadline, entryPreview, toDateOnly } from '../../journal/utils/journal-display';

export interface DashboardJournalSummary {
  hasMorningToday: boolean;
  hasEveningToday: boolean;
  currentMood: Mood | null;
  lastGratitude: string | null;
  latestReflection: { headline: string; preview: string } | null;
}

/** Derives all six Dashboard Journal widgets (Today's Journal Status, Morning/Evening Reflection
 * done-or-not, Current Mood, Last Gratitude, Latest Reflection) from two existing Journal calls —
 * GET /journal/:date for today's own entries and GET /journal/history for the most recent one
 * overall — the same "one/two endpoint(s), several derived widgets" shape
 * DashboardGoalsService/DashboardRoutineSummaryService already establish, per
 * docs/05-architecture.md's "avoid creating unnecessary dashboard-specific endpoints" rule. */
@Injectable({ providedIn: 'root' })
export class DashboardJournalService {
  private readonly journalApi = inject(JournalApiService);

  load(): Observable<DashboardJournalSummary> {
    const today = toDateOnly(new Date());

    return forkJoin({
      day: this.journalApi.getByDate(today),
      recent: this.journalApi.history({ pageSize: 1 }),
    }).pipe(
      map(({ day, recent }) => {
        const latest = recent.data[0] ?? null;
        const withGratitude = day.entries.find((entry) => entry.gratitude.length > 0) ?? latest;

        return {
          hasMorningToday: day.entries.some((entry) => entry.type === 'MORNING'),
          hasEveningToday: day.entries.some((entry) => entry.type === 'EVENING'),
          currentMood: latest?.mood ?? null,
          lastGratitude: withGratitude?.gratitude[0] ?? null,
          latestReflection: latest
            ? { headline: entryHeadline(latest), preview: entryPreview(latest) }
            : null,
        };
      }),
    );
  }
}
