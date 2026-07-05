import type { ExportFormat } from '../../../../generated/prisma/index.js';

/** A report's data, already assembled by AnalyticsReportService — flat enough that any format
 * (CSV/JSON/PDF) can encode it without knowing which domain it came from. */
export interface ExportGenerationInput {
  title: string;
  generatedAt: Date;
  /** Omitted for the OVERVIEW report, which has no period/window of its own. */
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, unknown>;
}

export interface ExportGenerationResult {
  success: boolean;
  /** Present when `success` is true — the file's own text content. */
  content?: string;
  /** Present when `success` is true — used to name the file written to disk. */
  extension?: string;
  /** Present when `success` is false — e.g. every PDF request today. */
  message?: string;
}

/**
 * The seam every export encoder implements — AnalyticsExportService depends only on this
 * interface, never a concrete generator, via ExportGeneratorRegistry. Mirrors the exact shape
 * ICalendarProvider/INotificationChannel/AiProvider already established: one small interface, a
 * registry keyed by format, and adapters that are safe to call even when unimplemented — this
 * module's fourth use of that pattern.
 */
export interface ExportGenerator {
  readonly format: ExportFormat;
  generate(input: ExportGenerationInput): ExportGenerationResult;
}
