import { CdkDrag, CdkDropList, type CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import type { BlockMoveEvent, BlockResizeEvent } from '../../components/planner-block/planner-block';
import { PlannerTimeline } from '../../components/planner-timeline/planner-timeline';
import { PlannerToolbar } from '../../components/planner-toolbar/planner-toolbar';
import { PlannerBlockActionsService } from '../../services/planner-block-actions.service';
import { PlannerStore } from '../../state/planner-store';
import { addDaysToLocalDateString, blockColor, formatDuration, formatTimeOfDay, TYPE_ICONS } from '../../utils/planner-display';

type ViewMode = 'timeline' | 'agenda';

/**
 * The full day editor — arbitrary date via `/schedule/day/:date` (defaults to today at
 * `/schedule/day`), with a Timeline view (drag-to-move + resize, see PlannerBlockComponent) and
 * an Agenda view (a plain reorderable list, using the exact same CDK drag pattern
 * RoutineEditorPage already established) that exercises POST /planner/reorder — the Timeline
 * positions blocks by time and has no use for a manual order index, so Agenda is where reordering
 * actually matters (e.g. narrow/mobile viewports where a vertical timeline is harder to scan).
 */
@Component({
  selector: 'app-day-view-page',
  imports: [
    CdkDropList,
    CdkDrag,
    MatButtonToggleModule,
    MatIconModule,
    Skeleton,
    EmptyState,
    PlannerToolbar,
    PlannerTimeline,
  ],
  templateUrl: './day-view-page.html',
  styleUrl: './day-view-page.scss',
})
export class DayViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly plannerStore = inject(PlannerStore);
  protected readonly actions = inject(PlannerBlockActionsService);

  protected readonly day = this.plannerStore.day;
  protected readonly blocks = this.plannerStore.blocks;
  protected readonly loading = this.plannerStore.loading;
  protected readonly error = this.plannerStore.error;
  protected readonly isEmpty = this.plannerStore.isEmpty;

  protected readonly viewMode = signal<ViewMode>('timeline');
  protected readonly agendaBlocks = computed(() =>
    [...this.blocks()].sort((a, b) => a.order - b.order),
  );

  protected readonly formatTimeOfDay = formatTimeOfDay;
  protected readonly formatDuration = formatDuration;
  protected readonly blockColor = blockColor;
  protected readonly typeIcons = TYPE_ICONS;

  ngOnInit(): void {
    const date = this.route.snapshot.paramMap.get('date');
    if (date) {
      this.plannerStore.loadDate(date);
    } else {
      this.plannerStore.loadToday();
    }
  }

  private currentDate(): string {
    return this.day()?.date ?? '';
  }

  protected onPreviousDay(): void {
    this.navigateRelative(-1);
  }

  protected onNextDay(): void {
    this.navigateRelative(1);
  }

  protected onDateChange(date: string): void {
    void this.router.navigate(['/schedule/day', date]);
    this.plannerStore.loadDate(date);
  }

  protected onGoToToday(): void {
    void this.router.navigate(['/schedule/day']);
    this.plannerStore.loadToday();
  }

  private navigateRelative(deltaDays: number): void {
    const target = addDaysToLocalDateString(this.currentDate(), deltaDays);
    void this.router.navigate(['/schedule/day', target]);
    this.plannerStore.loadDate(target);
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

  protected onAgendaDrop(event: CdkDragDrop<PlannerBlock[]>): void {
    const reordered = [...this.agendaBlocks()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.plannerStore.applyOptimisticOrder(reordered);
    this.plannerStore.reorder(reordered.map((block) => block.id)).subscribe();
  }
}
