import { Module } from '@nestjs/common';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';

@Module({
  controllers: [HabitsController],
  providers: [HabitsService],
  // Exported so PlannerService (Milestone 7) can reuse HabitsService's own ownership-scoped,
  // completion-computed "today" view instead of duplicating that Prisma logic.
  exports: [HabitsService],
})
export class HabitsModule {}
