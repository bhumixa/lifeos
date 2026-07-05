import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { GoalsModule } from './modules/goals/goals.module.js';
import { HabitsModule } from './modules/habits/habits.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { JournalModule } from './modules/journal/journal.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { RoutinesModule } from './modules/routines/routines.module.js';
import { StreaksModule } from './modules/streaks/streaks.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Global in-process event bus (see docs/05-architecture.md's Milestone 12 note) — the first
    // real use of the EventEmitter2 seam every prior milestone since Planner (Milestone 7) has
    // anticipated but left uninstalled. `.forRoot()` registers EventEmitter2 as a global
    // provider, so any module can inject it (to emit) or use `@OnEvent()` (to subscribe) without
    // importing this module directly — modules/notifications is the one module that subscribes.
    EventEmitterModule.forRoot(),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    TasksModule,
    RoutinesModule,
    HabitsModule,
    PlannerModule,
    StreaksModule,
    GoalsModule,
    JournalModule,
    CalendarModule,
    NotificationsModule,
    AiModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
