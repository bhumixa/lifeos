/** Emitted by TasksService.complete — see the class doc there for why this is the one call site
 * that emits it (not the general update() endpoint). */
export class TaskCompletedEvent {
  constructor(
    readonly userId: string,
    readonly taskId: string,
    readonly title: string,
  ) {}
}
