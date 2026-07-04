import { Component, computed, input } from '@angular/core';
import type { JournalEntry } from '@lifeos/shared-types';
import { JournalCard } from '../journal-card/journal-card';
import { formatEntryDate } from '../../utils/journal-display';

interface TimelineGroup {
  date: string;
  label: string;
  entries: JournalEntry[];
}

/** Groups a flat entry list by date (newest first) — Journal History's primary view, and the
 * Journal Dashboard's "recent entries" widget. */
@Component({
  selector: 'app-journal-timeline',
  imports: [JournalCard],
  templateUrl: './journal-timeline.html',
  styleUrl: './journal-timeline.scss',
})
export class JournalTimeline {
  readonly entries = input.required<JournalEntry[]>();

  protected readonly groups = computed<TimelineGroup[]>(() => {
    const byDate = new Map<string, JournalEntry[]>();
    for (const entry of this.entries()) {
      const bucket = byDate.get(entry.date) ?? [];
      bucket.push(entry);
      byDate.set(entry.date, bucket);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, groupEntries]) => ({ date, label: formatEntryDate(date), entries: groupEntries }));
  });
}
