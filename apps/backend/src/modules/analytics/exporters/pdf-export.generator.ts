import { Injectable } from '@nestjs/common';
import { ExportFormat } from '../../../../generated/prisma/index.js';
import { PlaceholderExportGenerator } from './placeholder-export.generator.js';

/** Placeholder adapter — see the class doc on PlaceholderExportGenerator. A future milestone wires
 * this to a real PDF library (e.g. pdfkit) once one is actually needed, per this milestone's own
 * "architecture only for PDF" instruction. */
@Injectable()
export class PdfExportGenerator extends PlaceholderExportGenerator {
  readonly format = ExportFormat.PDF;
  protected readonly displayName = 'PDF';
}
