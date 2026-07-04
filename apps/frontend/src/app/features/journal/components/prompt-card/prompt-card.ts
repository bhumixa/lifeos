import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { JournalPrompt } from '@lifeos/shared-types';

/** A single catalog prompt (question + placeholder) — rendered as inspiration alongside the
 * Morning/Evening entry forms, sourced from GET /journal/prompts. */
@Component({
  selector: 'app-prompt-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './prompt-card.html',
  styleUrl: './prompt-card.scss',
})
export class PromptCard {
  readonly prompt = input.required<JournalPrompt>();
}
