import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { Habit } from '@lifeos/shared-types';
import { HabitCompletionButton } from '../../../habits/components/habit-completion-button/habit-completion-button';
import { HabitApiService } from '../../../habits/services/habit-api.service';
import { HabitsStore } from '../../../habits/state/habits-store';

/**
 * Dashboard's "Quick Complete" panel — lets a habit be completed without leaving the dashboard,
 * per Milestone 6's brief. Fetches its own GET /habits/today (page-local, same reasoning as
 * RoutineSummaryCard) and reuses HabitsStore's mutation methods so the same increment/undo
 * semantics apply everywhere a completion button appears.
 */
@Component({
  selector: 'app-habits-quick-complete',
  imports: [RouterLink, MatButtonModule, MatCardModule, HabitCompletionButton],
  templateUrl: './habits-quick-complete.html',
  styleUrl: './habits-quick-complete.scss',
})
export class HabitsQuickComplete implements OnInit {
  private readonly habitApi = inject(HabitApiService);
  private readonly habitsStore = inject(HabitsStore);

  protected readonly loading = signal(true);
  protected readonly habits = signal<Habit[]>([]);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.habitApi.today().subscribe({
      next: (habits) => {
        this.habits.set(habits);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected complete(habit: Habit): void {
    this.habitsStore.quickComplete(habit).subscribe({ next: () => this.load() });
  }

  protected undo(habit: Habit): void {
    this.habitsStore.undoToday(habit).subscribe({ next: () => this.load() });
  }
}
