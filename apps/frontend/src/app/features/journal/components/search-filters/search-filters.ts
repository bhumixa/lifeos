import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import type { Energy, JournalSearchQueryParams, JournalType, Mood } from '@lifeos/shared-types';
import {
  ENERGY_LABELS,
  ENERGY_ORDER,
  MOOD_LABELS,
  MOOD_ORDER,
  TYPE_LABELS,
  toDateOnly,
} from '../../utils/journal-display';

/** The rich filter form Search Journals drives GET /journal/search with — date range, mood,
 * energy, tag, type, and a free-text keyword. Stateless: the page owns the actual query signal
 * and passes it back in via `value`, the same "dumb form, smart page" split GoalEditorPage's own
 * reactive form follows. */
@Component({
  selector: 'app-search-filters',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  templateUrl: './search-filters.html',
  styleUrl: './search-filters.scss',
})
export class SearchFilters {
  readonly value = input<JournalSearchQueryParams>({});
  readonly filtersChange = output<JournalSearchQueryParams>();

  protected readonly types = Object.entries(TYPE_LABELS) as [JournalType, string][];
  protected readonly moods = MOOD_ORDER.map((mood) => [mood, MOOD_LABELS[mood]] as [Mood, string]);
  protected readonly energies = ENERGY_ORDER.map(
    (energy) => [energy, ENERGY_LABELS[energy]] as [Energy, string],
  );

  protected update(patch: Partial<JournalSearchQueryParams>): void {
    this.filtersChange.emit({ ...this.value(), ...patch });
  }

  protected updateDate(key: 'dateFrom' | 'dateTo', date: Date | null): void {
    this.update({ [key]: date ? toDateOnly(date) : undefined });
  }

  protected reset(): void {
    this.filtersChange.emit({});
  }
}
