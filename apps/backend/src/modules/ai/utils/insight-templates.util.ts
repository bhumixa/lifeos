/**
 * Turns the plain metrics AiAnalysisService computed (see ai-metrics.util.ts) into the
 * human-readable {title, summary, content, confidence} shape AiInsightResult requires. This is
 * MockAiProvider's own logic, factored out into pure, unit-testable template functions — the same
 * "framework-free utils next to the service that uses them" convention every module's own
 * utils/ folder already follows. A real provider (OpenAiProvider/AnthropicProvider/GoogleAiProvider)
 * would send AiPromptService's prompt text to an actual completion API instead of calling any of
 * these — they exist purely so MockAiProvider has something real to do, the same role
 * LocalCalendarProvider/InAppChannel play among their own siblings.
 *
 * Every sourceData shape below is also what gets persisted verbatim on AiInsight.sourceData, so the
 * Dashboard's widgets (and a future richer AI Insights page) can read structured numbers directly
 * instead of parsing `content`'s prose — see the class doc on AiInsight in prisma/schema.prisma.
 * `flags` is the one generic, cross-type signal every shape below sets consistently: `['risk']`
 * marks an insight the Dashboard's Risk Alerts widget should surface, without inventing a
 * dedicated boolean column or a per-type parsing rule.
 */

import type {
  AiChatMessageInput,
  AiInsightResult,
} from '../providers/ai-provider.interface.js';
import type { WeekOverWeekRate } from './ai-metrics.util.js';

export interface ProductivitySourceData extends WeekOverWeekRate {
  bestWeekdays: string[];
  unreadNotifications: number;
  daysAvailable: number;
  confidence: number;
  flags: string[];
}

export function buildProductivityInsight(
  data: ProductivitySourceData,
): AiInsightResult {
  const trend =
    data.deltaPercent === 0
      ? `Your task and planner completion rate held steady at ${data.completionRateThisWeek}% this week.`
      : data.deltaPercent > 0
        ? `Your task and planner completion rate improved ${data.deltaPercent}% this week, up to ${data.completionRateThisWeek}%.`
        : `Your task and planner completion rate dropped ${Math.abs(data.deltaPercent)}% this week, down to ${data.completionRateThisWeek}%.`;

  const weekdaySentence =
    data.bestWeekdays.length > 0
      ? ` Your highest-productivity day${data.bestWeekdays.length > 1 ? 's are' : ' is'} ${data.bestWeekdays.join(' and ')}.`
      : '';

  const engagementSentence =
    data.unreadNotifications >= 5
      ? ` You have ${data.unreadNotifications} unread notifications — clearing them may help you stay on top of what's due.`
      : '';

  return {
    title: 'Weekly Productivity Trend',
    summary: trend,
    content: `${trend}${weekdaySentence}${engagementSentence}`.trim(),
    confidence: data.confidence,
  };
}

export interface HabitsSourceData {
  completionPercentageToday: number;
  totalActiveHabits: number;
  habitsCompletedToday: number;
  morningCompletions: number;
  eveningCompletions: number;
  confidence: number;
  flags: string[];
}

export function buildHabitsInsight(data: HabitsSourceData): AiInsightResult {
  if (data.totalActiveHabits === 0) {
    return {
      title: 'Habit Analysis',
      summary: 'No active habits to analyze yet.',
      content:
        'Once you create and log a few habits, this insight will surface patterns like your most consistent time of day.',
      confidence: data.confidence,
    };
  }

  const timeOfDaySentence =
    data.morningCompletions > data.eveningCompletions * 1.5
      ? ' You complete habits more often before 10 AM than later in the day — mornings look like your strongest window.'
      : data.eveningCompletions > data.morningCompletions * 1.5
        ? ' You complete habits more often in the evening than in the morning.'
        : '';

  const summary = `${data.habitsCompletedToday} of ${data.totalActiveHabits} active habits completed today (${data.completionPercentageToday}%).`;

  return {
    title: 'Habit Consistency',
    summary,
    content: `${summary}${timeOfDaySentence}`.trim(),
    confidence: data.confidence,
  };
}

export interface AtRiskGoal {
  id: string;
  title: string;
  progressPercent: number;
  expectedPercent: number;
  targetDate: string;
}

export interface GoalsSourceData {
  activeGoalCount: number;
  onTrackCount: number;
  atRiskGoals: AtRiskGoal[];
  confidence: number;
  flags: string[];
}

export function buildGoalsInsight(data: GoalsSourceData): AiInsightResult {
  if (data.activeGoalCount === 0) {
    return {
      title: 'Goal Progress',
      summary: 'No active goals to analyze yet.',
      content:
        'Create a goal with a target date to get deadline-risk analysis here.',
      confidence: data.confidence,
    };
  }

  if (data.atRiskGoals.length === 0) {
    return {
      title: 'Goal Progress',
      summary: `All ${data.activeGoalCount} active goals are on track.`,
      content: `All ${data.activeGoalCount} active goals are tracking at or ahead of schedule toward their target dates.`,
      confidence: data.confidence,
    };
  }

  const [worst] = [...data.atRiskGoals].sort(
    (a, b) =>
      a.progressPercent -
      a.expectedPercent -
      (b.progressPercent - b.expectedPercent),
  );
  const summary = `"${worst.title}" may miss its deadline — ${worst.progressPercent}% complete vs. an expected ${worst.expectedPercent}% by now.`;
  const others =
    data.atRiskGoals.length > 1
      ? ` ${data.atRiskGoals.length - 1} other goal${data.atRiskGoals.length > 2 ? 's are' : ' is'} also behind schedule.`
      : '';

  return {
    title: 'Goal Deadline Risk',
    summary,
    content: `${summary}${others}`.trim(),
    confidence: data.confidence,
  };
}

export interface PlannerSourceData extends WeekOverWeekRate {
  totalBlocksThisWeek: number;
  daysAvailable: number;
  confidence: number;
  flags: string[];
}

export function buildPlannerInsight(data: PlannerSourceData): AiInsightResult {
  if (data.totalBlocksThisWeek === 0) {
    return {
      title: 'Planner Recommendations',
      summary: 'No scheduled blocks this week yet.',
      content:
        'Add tasks, habits, or focus blocks to your Daily Planner to start seeing completion-rate trends here.',
      confidence: data.confidence,
    };
  }

  const trend =
    data.deltaPercent === 0
      ? `Your planner completion rate held steady at ${data.completionRateThisWeek}% this week.`
      : data.deltaPercent > 0
        ? `Your planner completion rate improved ${data.deltaPercent}% this week, up to ${data.completionRateThisWeek}%.`
        : `Your planner completion rate dropped ${Math.abs(data.deltaPercent)}% this week, down to ${data.completionRateThisWeek}%.`;

  const recommendation =
    data.deltaPercent < -10
      ? ' Consider scheduling fewer blocks per day, or moving your most important work to your highest-productivity hours.'
      : '';

  return {
    title: 'Planner Recommendations',
    summary: trend,
    content: `${trend}${recommendation}`.trim(),
    confidence: data.confidence,
  };
}

export interface JournalSourceData {
  direction: 'IMPROVING' | 'DECLINING' | 'STABLE';
  consecutiveDays: number;
  entriesAnalyzed: number;
  latestMood: string | null;
  confidence: number;
  flags: string[];
}

export function buildJournalInsight(data: JournalSourceData): AiInsightResult {
  if (data.entriesAnalyzed === 0) {
    return {
      title: 'Journal Reflection',
      summary: 'No journal entries with a mood yet.',
      content:
        'Log your mood in a few journal entries to unlock mood-trend insights here.',
      confidence: data.confidence,
    };
  }

  const summary =
    data.direction === 'IMPROVING'
      ? `Journal mood improved for ${data.consecutiveDays} consecutive days.`
      : data.direction === 'DECLINING'
        ? `Journal mood has declined for ${data.consecutiveDays} consecutive days.`
        : `Journal mood has been stable across your last ${data.entriesAnalyzed} entries.`;

  return {
    title: 'Journal Reflection',
    summary,
    content: summary,
    confidence: data.confidence,
  };
}

export interface StreaksSourceData {
  hasDailyHabits: boolean;
  currentStreak: number;
  longestStreak: number;
  isTodaySuccessful: boolean;
  freezesRemainingThisMonth: number;
  confidence: number;
  flags: string[];
}

export function buildStreaksInsight(data: StreaksSourceData): AiInsightResult {
  if (!data.hasDailyHabits) {
    return {
      title: 'Streak Analysis',
      summary: 'No daily habits to track a streak for yet.',
      content: 'Add a DAILY-frequency habit to start building a streak.',
      confidence: data.confidence,
    };
  }

  const streakSentence =
    data.currentStreak > 0
      ? `You're on a ${data.currentStreak}-day streak (longest: ${data.longestStreak}).`
      : `Your streak reset — your longest so far is ${data.longestStreak} days.`;

  const todaySentence = data.isTodaySuccessful
    ? ' Today is already a success.'
    : ' Today is not yet complete.';

  const freezeSentence =
    data.freezesRemainingThisMonth > 0
      ? ` You have ${data.freezesRemainingThisMonth} streak freeze${data.freezesRemainingThisMonth > 1 ? 's' : ''} left this month if you need one.`
      : '';

  return {
    title: 'Streak Analysis',
    summary: streakSentence,
    content: `${streakSentence}${todaySentence}${freezeSentence}`.trim(),
    confidence: data.confidence,
  };
}

export function buildSystemInsight(reason: string): AiInsightResult {
  return {
    title: 'AI Coach',
    summary: reason,
    content: reason,
    confidence: 1,
  };
}

/** MockAiProvider's chat reply — deliberately generic and advisory-only (per this milestone's
 * "no autonomous actions" business rule), since there's no real model behind it. Echoes the user's
 * latest message back inside a coaching frame rather than fabricating specific claims about the
 * user's data it hasn't actually analyzed. */
export function buildChatReply(messages: AiChatMessageInput[]): string {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'USER');
  const topic = lastUserMessage?.content?.trim();

  if (!topic) {
    return "I'm your AI Coach — ask me about your tasks, habits, goals, or planner, and I'll help you think it through. I can only offer suggestions; you're always the one who decides what to change.";
  }

  return (
    `Here's my read on "${topic.slice(0, 120)}${topic.length > 120 ? '…' : ''}": ` +
    'try generating a fresh insight from the AI Dashboard for a data-backed look at this, and treat anything I say here as a starting point for your own judgment, not a decision made for you.'
  );
}
