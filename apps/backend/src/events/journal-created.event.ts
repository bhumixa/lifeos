/** Emitted by JournalService.create. */
export class JournalCreatedEvent {
  constructor(
    readonly userId: string,
    readonly journalId: string,
    readonly type: string,
  ) {}
}
