import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-longest-streak',
  imports: [MatIconModule],
  templateUrl: './longest-streak.html',
  styleUrl: './longest-streak.scss',
})
export class LongestStreak {
  readonly days = input.required<number>();
}
