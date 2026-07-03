import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  // Exported so PlannerService (Milestone 7) can reuse TasksService's own ownership-scoped
  // queries for "tasks due today" instead of duplicating that Prisma logic.
  exports: [TasksService],
})
export class TasksModule {}
