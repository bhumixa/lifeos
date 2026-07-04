import { Injectable } from '@nestjs/common';
import { RemoteCalendarProvider } from './remote-calendar.provider.js';

/** Placeholder adapter — see the class doc on RemoteCalendarProvider. A future milestone wires
 * this up to Microsoft's OAuth consent flow and Outlook/Graph Calendar API. */
@Injectable()
export class MicrosoftCalendarProvider extends RemoteCalendarProvider {
  protected readonly displayName = 'Microsoft Outlook Calendar';
}
