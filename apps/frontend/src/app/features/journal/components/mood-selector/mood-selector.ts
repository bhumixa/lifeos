import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Mood } from '@lifeos/shared-types';
import { MOOD_EMOJI, MOOD_LABELS, MOOD_ORDER } from '../../utils/journal-display';

/** A row of five emoji buttons for picking a Mood — used by Morning/Evening entry forms and, in
 * read-only mode, by Journal Card/Detail to show a recorded mood without a color-only legend. */
@Component({
  selector: 'app-mood-selector',
  imports: [MatButtonModule, MatTooltipModule],
  templateUrl: './mood-selector.html',
  styleUrl: './mood-selector.scss',
})
export class MoodSelector {
  readonly value = input<Mood | null>(null);
  readonly disabled = input(false);
  readonly valueChange = output<Mood>();

  protected readonly moods = MOOD_ORDER;
  protected readonly emoji = MOOD_EMOJI;
  protected readonly labels = MOOD_LABELS;

  protected select(mood: Mood): void {
    if (!this.disabled()) {
      this.valueChange.emit(mood);
    }
  }
}
