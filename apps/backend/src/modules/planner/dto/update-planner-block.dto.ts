import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePlannerBlockDto } from './create-planner-block.dto.js';

/** Everything from CreatePlannerBlockDto except `date` — a block's day is fixed at creation;
 * moving it to a different date isn't a supported operation (create a new block instead). */
export class UpdatePlannerBlockDto extends PartialType(
  OmitType(CreatePlannerBlockDto, ['date'] as const),
) {}
