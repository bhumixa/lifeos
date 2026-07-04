/** Emitted by AchievementsService.evaluateAndUnlock, once per newly-unlocked achievement. */
export class AchievementUnlockedEvent {
  constructor(
    readonly userId: string,
    readonly achievementId: string,
    readonly title: string,
    readonly xpReward: number,
  ) {}
}
