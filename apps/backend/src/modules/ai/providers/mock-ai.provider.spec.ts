import { InsightType } from '../../../../generated/prisma/index.js';
import { MockAiProvider } from './mock-ai.provider.js';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();

  it('is the only provider named MOCK, distinct from the three placeholders', () => {
    expect(provider.name).toBe('MOCK');
  });

  it('generateInsight routes PRODUCTIVITY sourceData into a real, formatted sentence', async () => {
    const result = await provider.generateInsight({
      type: InsightType.PRODUCTIVITY,
      prompt: 'irrelevant to the mock',
      sourceData: {
        completionRateThisWeek: 48,
        completionRateLastWeek: 60,
        deltaPercent: -12,
        bestWeekdays: ['Tuesday', 'Wednesday'],
        unreadNotifications: 1,
        daysAvailable: 14,
        confidence: 1,
        flags: ['risk'],
      },
    });

    expect(result.content).toContain('dropped 12%');
    expect(result.content).toContain('Tuesday and Wednesday');
    expect(result.confidence).toBe(1);
  });

  it('analyzeHabits reports a morning-preference sentence when morning completions dominate', async () => {
    const result = await provider.analyzeHabits({
      type: InsightType.HABITS,
      prompt: 'irrelevant to the mock',
      sourceData: {
        completionPercentageToday: 100,
        totalActiveHabits: 2,
        habitsCompletedToday: 2,
        morningCompletions: 20,
        eveningCompletions: 2,
        confidence: 1,
        flags: [],
      },
    });

    expect(result.content).toContain('before 10 AM');
  });

  it('analyzeGoals names the single worst at-risk goal in the summary', async () => {
    const result = await provider.analyzeGoals({
      type: InsightType.GOALS,
      prompt: 'irrelevant to the mock',
      sourceData: {
        activeGoalCount: 2,
        onTrackCount: 1,
        atRiskGoals: [
          {
            id: 'goal-1',
            title: 'Ship the launch',
            progressPercent: 20,
            expectedPercent: 80,
            targetDate: '2026-08-01',
          },
        ],
        confidence: 0.9,
        flags: ['risk'],
      },
    });

    expect(result.summary).toContain('Ship the launch');
    expect(result.summary).toContain('may miss its deadline');
  });

  it('analyzeJournal reports a multi-day improving mood streak', async () => {
    const result = await provider.analyzeJournal({
      type: InsightType.JOURNAL,
      prompt: 'irrelevant to the mock',
      sourceData: {
        direction: 'IMPROVING',
        consecutiveDays: 6,
        entriesAnalyzed: 6,
        latestMood: 'GOOD',
        confidence: 0.9,
        flags: [],
      },
    });

    expect(result.summary).toBe(
      'Journal mood improved for 6 consecutive days.',
    );
  });

  it('analyzePlanner reports the week-over-week completion trend', async () => {
    const result = await provider.analyzePlanner({
      type: InsightType.PLANNER,
      prompt: 'irrelevant to the mock',
      sourceData: {
        completionRateThisWeek: 48,
        completionRateLastWeek: 60,
        deltaPercent: -12,
        totalBlocksThisWeek: 10,
        daysAvailable: 14,
        confidence: 1,
        flags: ['risk'],
      },
    });

    expect(result.summary).toContain('dropped 12%');
  });

  it('generateInsight routes STREAKS sourceData through the streaks template', async () => {
    const result = await provider.generateInsight({
      type: InsightType.STREAKS,
      prompt: 'irrelevant to the mock',
      sourceData: {
        hasDailyHabits: true,
        currentStreak: 7,
        longestStreak: 10,
        isTodaySuccessful: true,
        freezesRemainingThisMonth: 2,
        confidence: 0.9,
        flags: [],
      },
    });

    expect(result.summary).toContain('7-day streak');
  });

  it('generateInsight falls back to a system note for SYSTEM', async () => {
    const result = await provider.generateInsight({
      type: InsightType.SYSTEM,
      prompt: 'irrelevant to the mock',
      sourceData: { reason: 'No data available yet.' },
    });

    expect(result.content).toBe('No data available yet.');
  });

  it('chat never claims to have taken an action — advisory framing only', async () => {
    const result = await provider.chat([
      { role: 'USER', content: 'Can you finish my tasks for me?' },
    ]);
    expect(result.content.toLowerCase()).toContain('starting point');
  });
});
