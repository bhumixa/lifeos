import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module.js';
import { PlannerModule } from '../planner/planner.module.js';
import { StreaksController } from './streaks.controller.js';
import { StreaksService } from './streaks.service.js';
import { AchievementsController } from './achievements.controller.js';
import { AchievementsService } from './achievements.service.js';
import { FreezeDaysController } from './freeze-days.controller.js';
import { FreezeDaysService } from './freeze-days.service.js';

@Module({
  // HabitsModule is deliberately not imported: Habit/HabitLog are the Streak Engine's own
  // primary domain (StreaksService reads them directly via Prisma, the same way HabitsService
  // itself does — see the class doc on StreaksService), not something reused from another
  // module's service. TasksModule/PlannerModule *are* imported, since XP/achievement totals reuse
  // TasksService.countCompleted/PlannerService.countCompletedBlocks rather than re-querying those
  // tables here.
  imports: [TasksModule, PlannerModule],
  controllers: [
    StreaksController,
    AchievementsController,
    FreezeDaysController,
  ],
  providers: [StreaksService, AchievementsService, FreezeDaysService],
})
export class StreaksModule {}
