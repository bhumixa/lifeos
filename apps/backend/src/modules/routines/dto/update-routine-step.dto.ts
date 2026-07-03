import { PartialType } from '@nestjs/swagger';
import { CreateRoutineStepDto } from './create-routine-step.dto.js';

export class UpdateRoutineStepDto extends PartialType(CreateRoutineStepDto) {}
