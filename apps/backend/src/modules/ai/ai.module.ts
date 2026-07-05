import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module.js';
import { HabitsModule } from '../habits/habits.module.js';
import { JournalModule } from '../journal/journal.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PlannerModule } from '../planner/planner.module.js';
import { StreaksModule } from '../streaks/streaks.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiInsightsService } from './ai-insights.service.js';
import { AiPromptService } from './ai-prompt.service.js';
import { AiController } from './ai.controller.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { GoogleAiProvider } from './providers/google-ai.provider.js';
import { MockAiProvider } from './providers/mock-ai.provider.js';
import { AiProviderRegistry } from './providers/ai-provider.registry.js';
import { OpenAiProvider } from './providers/openai.provider.js';

/**
 * Imports every module AiAnalysisService reads from — Tasks/Habits/Planner/Streaks/Goals/Journal/
 * Notifications, the seven domains this milestone's own "generate insights from" list names — each
 * for its existing, read-only, exported methods only (see the class doc on AiAnalysisService and
 * AiInsight in prisma/schema.prisma for the two deliberately-unused write-side-effecting methods).
 * `StreaksModule`/`GoalsModule` each gained a one-line additive `exports: [...Service]` so this
 * import can resolve — no other existing behavior changed (see those modules' own class docs).
 * RoutinesModule/CalendarModule are not imported: this milestone's analysis list doesn't name
 * Routines or Calendar as a source, and neither exports anything AI Coach would otherwise need.
 *
 * Exports nothing — unlike Tasks/Habits/Planner/Journal/Streaks/Goals, no other module reuses
 * AiModule (yet); it is the current end of this codebase's module dependency chain.
 */
@Module({
  imports: [
    TasksModule,
    HabitsModule,
    PlannerModule,
    StreaksModule,
    GoalsModule,
    JournalModule,
    NotificationsModule,
  ],
  controllers: [AiController],
  providers: [
    AiAnalysisService,
    AiPromptService,
    AiInsightsService,
    AiConversationService,
    AiProviderRegistry,
    MockAiProvider,
    OpenAiProvider,
    AnthropicProvider,
    GoogleAiProvider,
  ],
})
export class AiModule {}
