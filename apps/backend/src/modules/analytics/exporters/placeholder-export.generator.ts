import type { ExportFormat } from '../../../../generated/prisma/index.js';
import type {
  ExportGenerationResult,
  ExportGenerator,
} from './export-generator.interface.js';

/**
 * Shared placeholder behavior for every not-yet-built encoder. Per this milestone's own
 * instruction ("Architecture only for PDF. Return NOT_IMPLEMENTED for PDF."), PdfExportGenerator
 * extends this rather than hand-writing the same result — the exact shape
 * PlaceholderNotificationChannel/PlaceholderAiProvider/RemoteCalendarProvider already established.
 * Never throws and never silently no-ops: `generate` always resolves to an explicit, clearly
 * labeled failure. A future milestone that wires up a real PDF library (e.g. pdfkit) deletes this
 * one subclass's inheritance and gives it a real body.
 */
export abstract class PlaceholderExportGenerator implements ExportGenerator {
  abstract readonly format: ExportFormat;
  protected abstract readonly displayName: string;

  generate(): ExportGenerationResult {
    return {
      success: false,
      message: `NOT_IMPLEMENTED: ${this.displayName} export is not yet implemented — a future milestone adds a real encoder.`,
    };
  }
}
