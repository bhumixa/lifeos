import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { HabitsModule } from '../habits/habits.module.js';
import { RoutinesModule } from '../routines/routines.module.js';
import { PlannerModule } from '../planner/planner.module.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

@Module({
  // Reuses TasksService/HabitsService/RoutinesService/PlannerService for progress aggregation
  // rather than querying their tables directly — see the class doc on GoalsService. Goal itself
  // has no other module reusing it back (yet), so unlike Tasks/Habits/Routines/Planner, this
  // module exports nothing.
  imports: [TasksModule, HabitsModule, RoutinesModule, PlannerModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
