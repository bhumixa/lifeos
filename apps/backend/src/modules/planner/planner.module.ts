import { Module } from '@nestjs/common';
import { HabitsModule } from '../habits/habits.module.js';
import { RoutinesModule } from '../routines/routines.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { PlannerController } from './planner.controller.js';
import { PlannerService } from './planner.service.js';

@Module({
  // Reuses TasksService/RoutinesService/HabitsService for the generator rather than querying
  // their tables directly — see the class doc on PlannerService.
  imports: [TasksModule, RoutinesModule, HabitsModule],
  controllers: [PlannerController],
  providers: [PlannerService],
})
export class PlannerModule {}
