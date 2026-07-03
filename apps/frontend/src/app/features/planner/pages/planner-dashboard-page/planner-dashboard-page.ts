import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { interval, map, startWith } from 'rxjs';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import type { BlockMoveEvent, BlockResizeEvent } from '../../components/planner-block/planner-block';
import { FocusTimer } from '../../components/focus-timer/focus-timer';
import { PlannerTimeline } from '../../components/planner-timeline/planner-timeline';
import { PlannerToolbar } from '../../components/planner-toolbar/planner-toolbar';
import { PlannerBlockActionsService } from '../../services/planner-block-actions.service';
import { PlannerStore } from '../../state/planner-store';
import { addDaysToLocalDateString, formatDuration, toLocalDateString } from '../../utils/planner-display';
import { computePlannerSummary } from '../../utils/planner-summary';

/** The Planner's own landing page — always "today", with a condensed stats row and a Focus Timer
 * for whichever FOCUS block is next, on top of the same interactive timeline Day View uses. Day
 * View is where a user goes to look at (or edit) a day other than today. */
@Component({
  selector: 'app-planner-dashboard-page',
  imports: [Skeleton, EmptyState, StatCard, MatButtonModule, MatIconModule, PlannerToolbar, PlannerTimeline, FocusTimer],
  templateUrl: './planner-dashboard-page.html',
  styleUrl: './planner-dashboard-page.scss',
})
export class PlannerDashboardPage implements OnInit {
  private readonly plannerStore = inject(PlannerStore);
  protected readonly actions = inject(PlannerBlockActionsService);
  private readonly router = inject(Router);

  protected readonly day = this.plannerStore.day;
  protected readonly blocks = this.plannerStore.blocks;
  protected readonly loading = this.plannerStore.loading;
  protected readonly error = this.plannerStore.error;
  protected readonly isEmpty = this.plannerStore.isEmpty;

  private readonly now = toSignal(
    interval(60_000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { initialValue: new Date() },
  );

  protected readonly summary = computed(() => computePlannerSummary(this.blocks(), this.now()));
  protected readonly focusBlock = computed<PlannerBlock | null>(
    () => this.blocks().find((block) => block.type === 'FOCUS' && !block.completed) ?? null,
  );
  protected readonly formatDuration = formatDuration;

  ngOnInit(): void {
    this.plannerStore.loadToday();
  }

  protected openDayView(): void {
    void this.router.navigate(['/schedule/day']);
  }

  /** The toolbar's date-nav controls always point into Day View — this page only ever shows
   * today, so "previous/next/pick a date" means "go look at that other day in Day View." */
  protected onPreviousDay(): void {
    void this.router.navigate(['/schedule/day', addDaysToLocalDateString(this.currentDate(), -1)]);
  }

  protected onNextDay(): void {
    void this.router.navigate(['/schedule/day', addDaysToLocalDateString(this.currentDate(), 1)]);
  }

  protected onDateChange(date: string): void {
    void this.router.navigate(['/schedule/day', date]);
  }

  private currentDate(): string {
    return this.day()?.date ?? toLocalDateString(new Date());
  }

  protected onGenerate(): void {
    this.actions.confirmGenerate(this.currentDate());
  }

  protected onAddBlock(): void {
    this.actions.openAddDialog(this.currentDate());
  }

  protected onEditBlock(block: PlannerBlock): void {
    this.actions.openEditDialog(this.currentDate(), block);
  }

  protected onToggleComplete(block: PlannerBlock): void {
    this.actions.toggleComplete(block);
  }

  protected onDeleteBlock(block: PlannerBlock): void {
    this.actions.confirmDelete(block);
  }

  protected onDuplicateBlock(block: PlannerBlock): void {
    this.actions.duplicate(block);
  }

  protected onMoveBlock(event: BlockMoveEvent): void {
    this.actions.move(event);
  }

  protected onResizeBlock(event: BlockResizeEvent): void {
    this.actions.resize(event);
  }
}
