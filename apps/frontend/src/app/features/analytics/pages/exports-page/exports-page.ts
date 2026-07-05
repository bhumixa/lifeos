import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { AnalyticsExport, PaginationMeta } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { ExportDialog } from '../../components/export-dialog/export-dialog';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { reportTypeLabel } from '../../utils/analytics-display';
import { triggerDownload } from '../../utils/trigger-download';

const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * Export history + the entry point for generating a new one. Historical rows (`AnalyticsExport`,
 * from `GET /analytics/export`) never carry the generated file's content — only the response to
 * `POST /analytics/export` does, since there's no separate download endpoint in this milestone's
 * own literal endpoint list (see AnalyticsExportService's class doc). A COMPLETED historical row
 * shows its `filePath` (where the file lives on the backend's own disk) for reference; the
 * browser download only happens immediately after generating it, in `onExported` below.
 */
@Component({
  selector: 'app-exports-page',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, EmptyState, Skeleton],
  templateUrl: './exports-page.html',
  styleUrl: './exports-page.scss',
})
export class ExportsPage implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly reportTypeLabel = reportTypeLabel;
  protected readonly loading = signal(true);
  protected readonly exports = signal<AnalyticsExport[]>([]);
  protected readonly meta = signal<PaginationMeta>(DEFAULT_META);

  ngOnInit(): void {
    this.load(1);
  }

  protected load(page: number): void {
    this.loading.set(true);
    this.analyticsApi.listExports({ page, pageSize: 20 }).subscribe({
      next: (result) => {
        this.exports.set(result.data);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openExportDialog(): void {
    this.dialog
      .open(ExportDialog)
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result.content) {
          triggerDownload(result);
        }
        this.load(1);
      });
  }
}
