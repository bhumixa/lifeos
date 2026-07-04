import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller.js';
import { JournalService } from './journal.service.js';

@Module({
  // No sibling-module imports: unlike Planner/Streaks/Goals, Journal's cross-feature integration
  // (showing today's habit/streak/planner state alongside a Morning/Evening entry, and a Goal's
  // related entries) is composed entirely on the frontend from each feature's own existing APIs —
  // see docs/05-architecture.md's Milestone 10 note — so there's no service reuse to wire up here.
  // goalId/plannerDayId ownership are raw Prisma existence checks (assertGoalOwnership/
  // assertPlannerDayOwnership on JournalService), the same pattern Task/Habit/Routine/PlannerBlock
  // already use for their own optional goalId link, rather than importing GoalsModule/
  // PlannerModule for a single existence check.
  controllers: [JournalController],
  providers: [JournalService],
  // Exported so a future AI Coach module can reuse JournalService as a read source — see the
  // class doc on JournalService.
  exports: [JournalService],
})
export class JournalModule {}
