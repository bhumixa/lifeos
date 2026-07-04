import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { JournalEntry } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import {
  MOOD_EMOJI,
  TYPE_ICONS,
  TYPE_LABELS,
  TYPE_VARIANTS,
  entryHeadline,
  entryPreview,
  formatEntryDate,
} from '../../utils/journal-display';

/** One entry's summary, linking to its detail page — the building block Journal Timeline/Search
 * results/Journal Dashboard's "recent entries" all reuse rather than each rendering their own
 * markup. */
@Component({
  selector: 'app-journal-card',
  imports: [RouterLink, MatCardModule, MatIconModule, Badge],
  templateUrl: './journal-card.html',
  styleUrl: './journal-card.scss',
})
export class JournalCard {
  readonly entry = input.required<JournalEntry>();

  protected readonly typeIcons = TYPE_ICONS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly typeVariants = TYPE_VARIANTS;
  protected readonly moodEmoji = MOOD_EMOJI;

  protected headline(): string {
    return entryHeadline(this.entry());
  }

  protected preview(): string {
    return entryPreview(this.entry());
  }

  protected formattedDate(): string {
    return formatEntryDate(this.entry().date);
  }
}
