import {
  CalendarProvider,
  type Calendar,
} from '../../../../generated/prisma/index.js';
import { AppleCalendarProvider } from './apple-calendar.provider.js';
import { CalendarProviderRegistry } from './calendar-provider.registry.js';
import { GoogleCalendarProvider } from './google-calendar.provider.js';
import { IcalCalendarProvider } from './ical-calendar.provider.js';
import { LocalCalendarProvider } from './local-calendar.provider.js';
import { MicrosoftCalendarProvider } from './microsoft-calendar.provider.js';

const calendar = {
  id: 'calendar-1',
  userId: 'user-1',
  name: 'Personal',
  color: '#3F51B5',
  timezone: 'UTC',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Calendar;

/** Provider abstraction: CalendarSyncService only ever depends on ICalendarProvider — this suite
 * verifies the registry resolves every CalendarProvider enum value to a distinct adapter, and
 * that swapping providers never requires the caller to know which concrete class it got. */
describe('CalendarProviderRegistry', () => {
  const registry = new CalendarProviderRegistry(
    new LocalCalendarProvider(),
    new GoogleCalendarProvider(),
    new MicrosoftCalendarProvider(),
    new AppleCalendarProvider(),
    new IcalCalendarProvider(),
  );

  it('resolves LOCAL to a provider that always succeeds without any external call', async () => {
    const provider = registry.resolve(CalendarProvider.LOCAL);
    await expect(provider.sync(calendar)).resolves.toEqual({
      status: 'SUCCESS',
    });
  });

  it.each([
    CalendarProvider.GOOGLE,
    CalendarProvider.MICROSOFT,
    CalendarProvider.APPLE,
    CalendarProvider.ICAL,
  ])(
    'resolves %s to a documented-placeholder provider that never calls an external API',
    async (provider) => {
      const adapter = registry.resolve(provider);
      const result = await adapter.sync(calendar);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toMatch(/not yet implemented/);
    },
  );

  it('resolves every distinct provider to a distinct adapter instance', () => {
    const resolved = new Set(
      [
        CalendarProvider.LOCAL,
        CalendarProvider.GOOGLE,
        CalendarProvider.MICROSOFT,
        CalendarProvider.APPLE,
        CalendarProvider.ICAL,
      ].map((provider) => registry.resolve(provider)),
    );
    expect(resolved.size).toBe(5);
  });
});
