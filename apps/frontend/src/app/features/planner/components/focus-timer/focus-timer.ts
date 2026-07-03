import { Component, OnDestroy, computed, effect, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { Subscription, interval } from 'rxjs';

/**
 * Self-contained Pomodoro-style countdown — entirely client-side (no persistence, no
 * notifications, no analytics; those are out of scope for this milestone). Defaults to a FOCUS
 * block's own duration when one is provided, otherwise a standard 25-minute session.
 */
@Component({
  selector: 'app-focus-timer',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './focus-timer.html',
  styleUrl: './focus-timer.scss',
})
export class FocusTimer implements OnDestroy {
  readonly block = input<PlannerBlock | null>(null);
  readonly defaultMinutes = input(25);

  private readonly totalSeconds = computed(() => (this.block()?.duration ?? this.defaultMinutes()) * 60);
  protected readonly remainingSeconds = signal(this.totalSeconds());
  protected readonly running = signal(false);

  protected readonly progressPercent = computed(() =>
    Math.round((1 - this.remainingSeconds() / this.totalSeconds()) * 100),
  );

  protected readonly formatted = computed(() => {
    const minutes = Math.floor(this.remainingSeconds() / 60);
    const seconds = this.remainingSeconds() % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  });

  private ticker: Subscription | null = null;

  constructor() {
    // Restarts the countdown whenever the tied block changes (e.g. selecting a different FOCUS
    // block) — reading `block()` inside the effect is what makes it re-run on that change.
    effect(() => {
      this.block();
      this.reset();
    });
  }

  protected start(): void {
    if (this.running() || this.remainingSeconds() === 0) {
      return;
    }
    this.running.set(true);
    this.ticker = interval(1000).subscribe(() => {
      this.remainingSeconds.update((seconds) => Math.max(0, seconds - 1));
      if (this.remainingSeconds() === 0) {
        this.pause();
      }
    });
  }

  protected pause(): void {
    this.running.set(false);
    this.ticker?.unsubscribe();
    this.ticker = null;
  }

  protected reset(): void {
    this.pause();
    this.remainingSeconds.set(this.totalSeconds());
  }

  ngOnDestroy(): void {
    this.ticker?.unsubscribe();
  }
}
