import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Achievement } from '@lifeos/shared-types';

/** One tile in the Achievement Gallery — locked achievements show a dimmed, greyscale icon and no
 * unlock date; unlocked ones show the real icon/color and when it was earned. */
@Component({
  selector: 'app-achievement-card',
  imports: [MatCardModule, MatIconModule, MatTooltipModule, DatePipe],
  templateUrl: './achievement-card.html',
  styleUrl: './achievement-card.scss',
})
export class AchievementCard {
  readonly achievement = input.required<Achievement>();
}
