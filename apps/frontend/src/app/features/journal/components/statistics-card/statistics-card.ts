import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { JournalEntry, Mood } from '@lifeos/shared-types';
import { MOOD_EMOJI, MOOD_LABELS, toDateOnly } from '../../utils/journal-display';

/** Small at-a-glance stats derived client-side from a list of entries — total, entries in the
 * last 7 days, most common mood, and average self-rated productivity. The same "derived via
 * local computation, no dedicated backend endpoint" shape the Dashboard's own
 * DashboardGoalsService/DashboardRoutineSummaryService already establish. */
@Component({
  selector: 'app-statistics-card',
  imports: [MatCardModule],
  templateUrl: './statistics-card.html',
  styleUrl: './statistics-card.scss',
})
export class StatisticsCard {
  readonly entries = input<JournalEntry[]>([]);

  protected readonly totalEntries = computed(() => this.entries().length);

  protected readonly entriesThisWeek = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = toDateOnly(weekAgo);
    return this.entries().filter((entry) => entry.date >= cutoff).length;
  });

  protected readonly averageProductivity = computed(() => {
    const rated = this.entries().filter((entry) => entry.productivity !== null);
    if (rated.length === 0) {
      return null;
    }
    const sum = rated.reduce((total, entry) => total + (entry.productivity ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  protected readonly mostCommonMood = computed<{ emoji: string; label: string } | null>(() => {
    const counts = new Map<Mood, number>();
    for (const entry of this.entries()) {
      if (entry.mood) {
        counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1);
      }
    }
    if (counts.size === 0) {
      return null;
    }
    const [mood] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { emoji: MOOD_EMOJI[mood], label: MOOD_LABELS[mood] };
  });
}
