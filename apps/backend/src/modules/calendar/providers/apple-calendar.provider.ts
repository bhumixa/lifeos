import { Injectable } from '@nestjs/common';
import { RemoteCalendarProvider } from './remote-calendar.provider.js';

/** Placeholder adapter — see the class doc on RemoteCalendarProvider. A future milestone wires
 * this up to Apple's Sign in with Apple + CalDAV integration. */
@Injectable()
export class AppleCalendarProvider extends RemoteCalendarProvider {
  protected readonly displayName = 'Apple Calendar';
}
