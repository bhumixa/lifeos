import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Calendar, CalendarProvider } from '@lifeos/shared-types';
import { ConfirmDialog, type ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { TimezoneSelector } from '../../components/timezone-selector/timezone-selector';
import { CalendarStore } from '../../state/calendar-store';

const PROVIDER_OPTIONS: CalendarProvider[] = ['LOCAL', 'GOOGLE', 'MICROSOFT', 'APPLE', 'ICAL'];
const COLOR_OPTIONS = ['#3F51B5', '#009688', '#4CAF50', '#FF9800', '#9E9E9E', '#607D8B', '#E91E63'];

/**
 * Manage calendars — create/edit/delete, toggle enabled, and trigger POST /calendar/sync. Every
 * non-LOCAL provider is selectable (per "design pluggable integrations") but its Sync button
 * always reports the documented "not yet implemented" result — see the class doc on
 * RemoteCalendarProvider. Create/edit uses one inline form (not a dialog) since the whole page is
 * already dedicated to calendar management, unlike Event create/edit which needs a dialog to stay
 * available from every view.
 */
@Component({
  selector: 'app-calendar-settings-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    Skeleton,
    EmptyState,
    TimezoneSelector,
  ],
  templateUrl: './calendar-settings-page.html',
  styleUrl: './calendar-settings-page.scss',
})
export class CalendarSettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(CalendarStore);

  protected readonly providerOptions = PROVIDER_OPTIONS;
  protected readonly colorOptions = COLOR_OPTIONS;
  protected readonly editingId = signal<string | null>(null);
  protected readonly syncingId = signal<string | null>(null);
  protected readonly syncResults = signal<Record<string, string>>({});

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    provider: ['LOCAL' as CalendarProvider, [Validators.required]],
    color: [COLOR_OPTIONS[0], [Validators.required]],
    timezone: ['UTC', [Validators.required]],
    enabled: [true],
  });

  ngOnInit(): void {
    this.store.load();
  }

  protected startCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', provider: 'LOCAL', color: COLOR_OPTIONS[0], timezone: 'UTC', enabled: true });
  }

  protected startEdit(calendar: Calendar): void {
    this.editingId.set(calendar.id);
    this.form.setValue({
      name: calendar.name,
      provider: calendar.provider,
      color: calendar.color,
      timezone: calendar.timezone,
      enabled: calendar.enabled,
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingId = this.editingId();
    const save$ = editingId ? this.store.update(editingId, value) : this.store.create(value);
    save$.subscribe(() => this.startCreate());
  }

  protected onSync(calendar: Calendar): void {
    this.syncingId.set(calendar.id);
    this.store.sync(calendar.id).subscribe({
      next: (sync) => {
        this.syncResults.update((results) => ({
          ...results,
          [calendar.id]: sync.status === 'SUCCESS' ? 'Synced' : (sync.errorMessage ?? 'Sync failed'),
        }));
        this.syncingId.set(null);
      },
      error: () => this.syncingId.set(null),
    });
  }

  protected onDelete(calendar: Calendar): void {
    const dialogRef = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete calendar?',
        message: `This deletes "${calendar.name}" and all of its events. This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.remove(calendar.id).subscribe();
      }
    });
  }
}
