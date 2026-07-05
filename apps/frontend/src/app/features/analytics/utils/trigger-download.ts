import type { AnalyticsExportResult } from '@lifeos/shared-types';

const MIME_TYPES: Record<string, string> = {
  CSV: 'text/csv',
  JSON: 'application/json',
};

/** Triggers a browser download of an export's own inline `content` — there is no separate
 * `GET .../download` endpoint in this milestone's own literal endpoint list, so `POST
 * /analytics/export` returns the generated text directly and this is what turns it into a saved
 * file client-side. A no-op for a FAILED/NOT_IMPLEMENTED result (`content: null`, e.g. every PDF
 * request today) — the caller is expected to show `errorMessage` instead. */
export function triggerDownload(result: AnalyticsExportResult): void {
  if (!result.content) {
    return;
  }
  const mimeType = MIME_TYPES[result.format] ?? 'text/plain';
  const blob = new Blob([result.content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${result.type.toLowerCase()}-export.${result.format.toLowerCase()}`;
  link.click();
  URL.revokeObjectURL(url);
}
