import { Injectable } from '@nestjs/common';
import { RemoteCalendarProvider } from './remote-calendar.provider.js';

/** Placeholder adapter — see the class doc on RemoteCalendarProvider. A future milestone wires
 * this up to Google's OAuth consent flow and Calendar API. */
@Injectable()
export class GoogleCalendarProvider extends RemoteCalendarProvider {
  protected readonly displayName = 'Google Calendar';
}
