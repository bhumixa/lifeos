import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoutineDto } from './create-routine.dto.js';

// Steps are managed via the dedicated nested step endpoints (POST/PATCH/DELETE
// /routines/:id/steps, reorder) — omitted here so a general routine update can't silently
// replace the whole step list.
export class UpdateRoutineDto extends PartialType(
  OmitType(CreateRoutineDto, ['steps'] as const),
) {}
