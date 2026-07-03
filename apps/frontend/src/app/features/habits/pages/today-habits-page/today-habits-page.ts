import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Habit } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { HabitCard } from '../../components/habit-card/habit-card';
import { HabitApiService } from '../../services/habit-api.service';
import { HabitsStore } from '../../state/habits-store';

/**
 * Page-local, like TaskDetailPage — a fresh GET /habits/today fetch each visit, not routed
 * through HabitsStore (which owns the *filtered/paginated* Habit List, a different query
 * shape). Mutations still go through HabitsStore so a later visit to the Habit List page
 * reflects today's quick-complete taps.
 */
@Component({
  selector: 'app-today-habits-page',
  imports: [MatButtonModule, MatIconModule, EmptyState, Skeleton, HabitCard],
  templateUrl: './today-habits-page.html',
  styleUrl: './today-habits-page.scss',
})
export class TodayHabitsPage implements OnInit {
  private readonly habitApi = inject(HabitApiService);
  private readonly habitsStore = inject(HabitsStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly habits = signal<Habit[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly isEmpty = computed(() => !this.loading() && !this.error() && this.habits().length === 0);

  protected readonly skeletonRows = Array.from({ length: 4 });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.habitApi.today().subscribe({
      next: (habits) => {
        this.habits.set(habits);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Could not load today's habits. Please try again.");
        this.loading.set(false);
      },
    });
  }

  protected viewHabit(habit: Habit): void {
    void this.router.navigate(['/habits', habit.id]);
  }

  protected completeHabit(habit: Habit): void {
    this.habitsStore.quickComplete(habit).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open('Could not log the habit', 'Dismiss', { duration: 3000 }),
    });
  }

  protected undoHabit(habit: Habit): void {
    this.habitsStore.undoToday(habit).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open("Could not undo today's log", 'Dismiss', { duration: 3000 }),
    });
  }

  protected toggleActive(habit: Habit): void {
    this.habitsStore.updateHabit(habit.id, { isActive: !habit.isActive }).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open('Could not update the habit', 'Dismiss', { duration: 3000 }),
    });
  }

  protected retry(): void {
    this.load();
  }
}
