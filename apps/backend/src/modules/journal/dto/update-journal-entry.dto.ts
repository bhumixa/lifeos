import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateJournalEntryDto } from './create-journal-entry.dto.js';

// `date`/`type` can't change via PATCH — the same "create a new one instead" rule
// PlannerBlock.date already follows (see PlannerController): changing either one would silently
// let an entry hop across the one-morning/one-evening-per-day rule the create path enforces.
export class UpdateJournalEntryDto extends PartialType(
  OmitType(CreateJournalEntryDto, ['date', 'type'] as const),
) {}
