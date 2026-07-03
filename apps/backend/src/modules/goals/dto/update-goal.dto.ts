import { PartialType } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto.js';

// `currentValue` is inherited from CreateGoalDto — GoalsService only actually applies a
// client-supplied currentValue when the goal's targetType is CUSTOM (see the class doc on
// GoalsService); for automatic target types it's silently ignored rather than rejected, the same
// "never trust frontend data" rule PlannerBlock.duration already applies to a different field.
export class UpdateGoalDto extends PartialType(CreateGoalDto) {}
