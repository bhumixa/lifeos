import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { GoalsModule } from './modules/goals/goals.module.js';
import { HabitsModule } from './modules/habits/habits.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { JournalModule } from './modules/journal/journal.module.js';
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
  ],
})
export class AppModule {}
