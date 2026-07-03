import { Module } from '@nestjs/common';
import { RoutinesController } from './routines.controller.js';
import { RoutinesService } from './routines.service.js';

@Module({
  controllers: [RoutinesController],
  providers: [RoutinesService],
  // Exported so PlannerService (Milestone 7) can reuse RoutinesService's own ownership-scoped
  // queries for "today's active routine steps" instead of duplicating that Prisma logic.
  exports: [RoutinesService],
})
export class RoutinesModule {}
