/** Emitted by PlannerService.complete, only when a block transitions to `completed: true` (not
 * when a user un-completes one) — see the class doc on PlannerService.complete. */
export class PlannerBlockCompletedEvent {
  constructor(
    readonly userId: string,
    readonly blockId: string,
    readonly title: string,
  ) {}
}
