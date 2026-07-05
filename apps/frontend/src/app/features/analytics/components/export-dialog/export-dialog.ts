import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { AnalyticsExportResult, AnalyticsPeriod, AnalyticsReportType, ExportFormat } from '@lifeos/shared-types';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { periodLabel, reportTypeLabel } from '../../utils/analytics-display';

const REPORT_TYPES: AnalyticsReportType[] = ['OVERVIEW', 'PRODUCTIVITY', 'HABITS', 'GOALS', 'PLANNER', 'JOURNAL', 'CALENDAR'];
const FORMATS: ExportFormat[] = ['CSV', 'JSON', 'PDF'];
const PERIODS: AnalyticsPeriod[] = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

/**
 * Unlike most of this codebase's form dialogs (which only collect input and hand it back via
 * `dialogRef.close()`), this one performs the export itself — `POST /analytics/export` is a
 * one-shot action with no separate "create" step the hosting page would otherwise own, so calling
 * AnalyticsApiService directly here (the same "a dialog may call an API when its whole purpose is
 * one action" precedent EventDialog already sets) avoids ExportsPage needing to duplicate this
 * dialog's own form state just to make the same call. Closes with the created
 * `AnalyticsExportResult` (or nothing, if cancelled) so the hosting page can trigger the browser
 * download and refresh its own history list.
 */
@Component({
  selector: 'app-export-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './export-dialog.html',
  styleUrl: './export-dialog.scss',
})
export class ExportDialog {
  private readonly fb = inject(FormBuilder);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly dialogRef = inject(MatDialogRef<ExportDialog, AnalyticsExportResult>);

  protected readonly reportTypes = REPORT_TYPES;
  protected readonly formats = FORMATS;
  protected readonly periods = PERIODS;
  protected readonly reportTypeLabel = reportTypeLabel;
  protected readonly periodLabel = periodLabel;

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<AnalyticsReportType>('OVERVIEW', Validators.required),
    format: this.fb.nonNullable.control<ExportFormat>('CSV', Validators.required),
    period: this.fb.nonNullable.control<AnalyticsPeriod>('WEEK', Validators.required),
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    this.analyticsApi.createExport(raw).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.dialogRef.close(result);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Could not generate the export. Please try again.');
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
