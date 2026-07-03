import { PartialType } from '@nestjs/swagger';
import { CreateHabitDto } from './create-habit.dto.js';

export class UpdateHabitDto extends PartialType(CreateHabitDto) {}
