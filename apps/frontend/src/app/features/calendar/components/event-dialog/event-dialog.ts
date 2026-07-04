import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Calendar, CalendarEvent, CalendarStatus, CreateCalendarEventRequest } from '@lifeos/shared-types';
import { CalendarStore } from '../../state/calendar-store';

export interface EventDialogData {
  mode: 'create' | 'edit';
  calendars: Calendar[];
  event?: CalendarEvent;
  /** Prefilled start instant for a create opened from a specific grid cell/agenda slot. */
  defaultStartTime?: string;
  defaultCalendarId?: string;
}

/** Always closes with every CreateCalendarEventRequest field populated (`status` added only in
 * edit mode) — a value shaped this way satisfies both CreateCalendarEventRequest (POST) and
 * UpdateCalendarEventRequest (PATCH, since Partial<Create> accepts a fully-populated object too),
 * so the caller can pass it to either CalendarApiService method without a cast. */
export type EventDialogResult = CreateCalendarEventRequest & { status?: CalendarStatus };

/**
 * Create/edit form for a single CalendarEvent. The "Advanced links" panel exposes the same four
 * optional cross-links CreateCalendarEventDto accepts (plannerBlockId/taskId/goalId/
 * journalEntryId) as plain id fields rather than full cross-feature search-selects — matching
 * BlockDialog's own precedent of only building a real picker where the milestone brief actually
 * calls for one; here the milestone's own "Testing" verification asks specifically to "Link
 * planner block," which a plain id field already exercises end-to-end. journalEntryId is
 * displayed read-only when already set (per "Journal entries remain read-only references") and
 * is otherwise not offered as a create-time field.
 */
@Component({
  selector: 'app-event-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatExpansionModule,
  ],
  templateUrl: './event-dialog.html',
  styleUrl: './event-dialog.scss',
})
export class EventDialog {
  protected readonly data = inject<EventDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EventDialog, EventDialogResult>);
  private readonly fb = inject(FormBuilder);
  protected readonly store = inject(CalendarStore);

  protected readonly isEditMode = this.data.mode === 'edit';
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    calendarId: [
      this.data.event?.calendarId ?? this.data.defaultCalendarId ?? this.data.calendars[0]?.id ?? '',
      [Validators.required],
    ],
    title: [this.data.event?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.event?.description ?? ''],
    allDay: [this.data.event?.allDay ?? false],
    startTime: [toDateTimeInput(this.data.event?.startTime ?? this.data.defaultStartTime ?? new Date().toISOString()), [Validators.required]],
    endTime: [
      toDateTimeInput(this.data.event?.endTime ?? addOneHour(this.data.event?.startTime ?? this.data.defaultStartTime ?? new Date().toISOString())),
      [Validators.required],
    ],
    location: [this.data.event?.location ?? ''],
    status: [this.data.event?.status ?? ('ACTIVE' as const)],
    taskId: [this.data.event?.taskId ?? ''],
    goalId: [this.data.event?.goalId ?? ''],
    plannerBlockId: [this.data.event?.plannerBlockId ?? ''],
  });

  protected readonly journalEntryId = this.data.event?.journalEntryId ?? null;

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const startTime = new Date(raw.startTime).toISOString();
    const endTime = new Date(raw.endTime).toISOString();
    if (new Date(endTime) <= new Date(startTime)) {
      this.form.controls.endTime.setErrors({ range: true });
      return;
    }

    const payload: EventDialogResult = {
      calendarId: raw.calendarId,
      title: raw.title,
      description: raw.description || undefined,
      startTime,
      endTime,
      allDay: raw.allDay,
      location: raw.location || undefined,
      taskId: raw.taskId || undefined,
      goalId: raw.goalId || undefined,
      plannerBlockId: raw.plannerBlockId || undefined,
      ...(this.isEditMode && { status: raw.status }),
    };
    this.dialogRef.close(payload);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

/** ISO datetime -> "YYYY-MM-DDTHH:mm" for pre-filling a native `datetime-local` input, in the
 * viewer's local timezone. */
function toDateTimeInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addOneHour(isoDateTime: string): string {
  return new Date(new Date(isoDateTime).getTime() + 60 * 60_000).toISOString();
}
