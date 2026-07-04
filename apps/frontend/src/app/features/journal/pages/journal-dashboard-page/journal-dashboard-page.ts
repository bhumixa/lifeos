import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { JournalEntry, StreaksToday } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StreaksApiService } from '../../../streaks/services/streaks-api.service';
import { JournalTimeline } from '../../components/journal-timeline/journal-timeline';
import { StatisticsCard } from '../../components/statistics-card/statistics-card';
import { JournalApiService } from '../../services/journal-api.service';
import { MOOD_EMOJI, MOOD_LABELS, entryHeadline, entryPreview, toDateOnly } from '../../utils/journal-display';

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
}

/** The Journal hub — today's morning/evening status, current mood, last gratitude, latest
 * reflection, a recent-entries timeline, and the current streak (read from Streaks' own existing
 * endpoint, not duplicated here) — everything composed from Journal's own APIs plus one existing
 * Streaks call, per the milestone's "Dashboard: reuse Journal APIs, don't add
 * dashboard-specific endpoints" rule applied to this feature's own dashboard. */
@Component({
  selector: 'app-journal-dashboard-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    EmptyState,
    Skeleton,
    StatCard,
    JournalTimeline,
    StatisticsCard,
  ],
  templateUrl: './journal-dashboard-page.html',
  styleUrl: './journal-dashboard-page.scss',
})
export class JournalDashboardPage implements OnInit {
  private readonly journalApi = inject(JournalApiService);
  private readonly streaksApi = inject(StreaksApiService);

  protected readonly today = toDateOnly(new Date());
  protected readonly loading = signal(true);
  protected readonly hasMorning = signal(false);
  protected readonly hasEvening = signal(false);
  protected readonly recentEntries = signal<JournalEntry[]>([]);
  protected readonly streaksToday = signal<StreaksToday | null>(null);

  protected readonly moodEmoji = MOOD_EMOJI;
  protected readonly moodLabels = MOOD_LABELS;

  protected readonly latestEntry = computed<JournalEntry | null>(() => this.recentEntries()[0] ?? null);

  protected readonly latestGratitude = computed<string | null>(() => {
    const withGratitude = this.recentEntries().find((entry) => entry.gratitude.length > 0);
    return withGratitude?.gratitude[0] ?? null;
  });

  protected readonly statusStats = computed<DashboardStat[]>(() => [
    { label: 'Morning Journal', value: this.hasMorning() ? 'Done' : 'Not yet', icon: 'wb_sunny' },
    { label: 'Evening Journal', value: this.hasEvening() ? 'Done' : 'Not yet', icon: 'nights_stay' },
    {
      label: 'Current Mood',
      value: this.latestEntry()?.mood ? this.moodLabels[this.latestEntry()!.mood!] : '—',
      icon: 'mood',
    },
    { label: 'Writing Streak', value: this.streaksToday() ? (this.streaksToday()!.isTodaySuccessful ? 'On track' : 'Keep going') : '—', icon: 'local_fire_department' },
  ]);

  protected headline(entry: JournalEntry): string {
    return entryHeadline(entry);
  }

  protected preview(entry: JournalEntry): string {
    return entryPreview(entry);
  }

  ngOnInit(): void {
    this.journalApi.getByDate(this.today).subscribe({
      next: (day) => {
        this.hasMorning.set(day.entries.some((entry) => entry.type === 'MORNING'));
        this.hasEvening.set(day.entries.some((entry) => entry.type === 'EVENING'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.journalApi.history({ pageSize: 5 }).subscribe((result) => this.recentEntries.set(result.data));
    this.streaksApi.today().subscribe((streak) => this.streaksToday.set(streak));
  }
}
