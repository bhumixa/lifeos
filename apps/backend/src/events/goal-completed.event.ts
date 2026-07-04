/** Emitted by GoalsService.update, only on the explicit transition into GoalStatus.COMPLETED —
 * Goal status is user/PATCH-driven, not auto-derived from currentValue (see the class doc on
 * GoalsService), so this is the one clear "a goal just finished" moment to react to. */
export class GoalCompletedEvent {
  constructor(
    readonly userId: string,
    readonly goalId: string,
    readonly title: string,
  ) {}
}
