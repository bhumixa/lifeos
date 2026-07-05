import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { HabitsModule } from '../habits/habits.module.js';
import { RoutinesModule } from '../routines/routines.module.js';
import { PlannerModule } from '../planner/planner.module.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

@Module({
  // Reuses TasksService/HabitsService/RoutinesService/PlannerService for progress aggregation
  // rather than querying their tables directly — see the class doc on GoalsService.
  imports: [TasksModule, HabitsModule, RoutinesModule, PlannerModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  // Exported so AiModule (Milestone 13) can reuse GoalsService.findAll for GOALS insight analysis
  // — deliberately not getProgress, since that method persists a refreshed currentValue as a side
  // effect, which AI Coach's "never modifies data" business rule rules out. A small, additive
  // export — no existing behavior changes — the same "export for a documented future reuse"
  // convention Tasks/Habits/Routines/Planner already follow.
  exports: [GoalsService],
})
export class GoalsModule {}
