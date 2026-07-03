import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toLocalDateString } from '../../utils/planner-display';

/** Date navigation + primary actions shared by the Planner Dashboard and Day View pages. Purely
 * presentational — the host page owns what "previous/next/today/generate/add" actually do. */
@Component({
  selector: 'app-planner-toolbar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './planner-toolbar.html',
  styleUrl: './planner-toolbar.scss',
})
export class PlannerToolbar {
  readonly date = input.required<string>();
  readonly generating = input(false);

  readonly previousDay = output<void>();
  readonly nextDay = output<void>();
  readonly goToToday = output<void>();
  readonly dateChange = output<string>();
  readonly generate = output<void>();
  readonly addBlock = output<void>();

  protected readonly isToday = computed(() => this.date() === toLocalDateString(new Date()));

  protected readonly formattedDate = computed(() => {
    const [year, month, day] = this.date().split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  protected onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.dateChange.emit(value);
    }
  }
}
