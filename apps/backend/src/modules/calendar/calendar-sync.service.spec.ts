import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  CalendarProvider,
  type Calendar,
} from '../../../generated/prisma/index.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarService } from './calendar.service.js';
import { CalendarProviderRegistry } from './providers/calendar-provider.registry.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: 'calendar-1',
    userId: 'user-1',
    name: 'Personal',
    provider: CalendarProvider.LOCAL,
    color: '#3F51B5',
    timezone: 'UTC',
    enabled: true,
    createdAt: new Date('2026-07-04T00:00:00.000Z'),
    updatedAt: new Date('2026-07-04T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CalendarSyncService', () => {
  let service: CalendarSyncService;
  let prisma: { calendarSync: { create: jest.Mock } };
  let calendarService: { findCalendarOrThrow: jest.Mock };
  let providerRegistry: { resolve: jest.Mock };

  const userId = 'user-1';

  beforeEach(async () => {
    prisma = { calendarSync: { create: jest.fn() } };
    calendarService = { findCalendarOrThrow: jest.fn() };
    providerRegistry = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendarService },
        { provide: CalendarProviderRegistry, useValue: providerRegistry },
      ],
    }).compile();

    service = module.get(CalendarSyncService);
  });

  it('verifies calendar ownership before resolving a provider', async () => {
    calendarService.findCalendarOrThrow.mockResolvedValue(makeCalendar());
    const sync = jest.fn().mockResolvedValue({ status: 'SUCCESS' });
    providerRegistry.resolve.mockReturnValue({ sync });
    prisma.calendarSync.create.mockResolvedValue({
      id: 'sync-1',
      calendarId: 'calendar-1',
      lastSync: new Date(),
      status: 'SUCCESS',
      errorMessage: null,
      createdAt: new Date(),
    });

    await service.sync(userId, { calendarId: 'calendar-1' });

    expect(calendarService.findCalendarOrThrow).toHaveBeenCalledWith(
      userId,
      'calendar-1',
    );
  });

  it('resolves the provider matching the calendar’s own provider field — provider abstraction', async () => {
    const calendar = makeCalendar({ provider: CalendarProvider.GOOGLE });
    calendarService.findCalendarOrThrow.mockResolvedValue(calendar);
    const sync = jest
      .fn()
      .mockResolvedValue({ status: 'FAILED', errorMessage: 'not implemented' });
    providerRegistry.resolve.mockReturnValue({ sync });
    prisma.calendarSync.create.mockResolvedValue({});

    await service.sync(userId, { calendarId: 'calendar-1' });

    expect(providerRegistry.resolve).toHaveBeenCalledWith(
      CalendarProvider.GOOGLE,
    );
    expect(sync).toHaveBeenCalledWith(calendar);
  });

  it('LOCAL provider: persists a SUCCESS row with lastSync set', async () => {
    calendarService.findCalendarOrThrow.mockResolvedValue(makeCalendar());
    providerRegistry.resolve.mockReturnValue({
      sync: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
    });
    prisma.calendarSync.create.mockResolvedValue({});

    await service.sync(userId, { calendarId: 'calendar-1' });

    expect(prisma.calendarSync.create).toHaveBeenCalledWith(
      matching<{ data: unknown }>({
        data: matching({
          calendarId: 'calendar-1',
          status: 'SUCCESS',
          errorMessage: null as string | null,
          lastSync: expect.any(Date) as Date | null,
        }),
      }),
    );
  });

  it('remote provider (GOOGLE/MICROSOFT/APPLE/ICAL): persists a FAILED row with a documented errorMessage and null lastSync', async () => {
    calendarService.findCalendarOrThrow.mockResolvedValue(
      makeCalendar({ provider: CalendarProvider.MICROSOFT }),
    );
    providerRegistry.resolve.mockReturnValue({
      sync: jest.fn().mockResolvedValue({
        status: 'FAILED',
        errorMessage:
          'Microsoft Outlook Calendar sync is not yet implemented — OAuth and API integration are a planned future milestone.',
      }),
    });
    prisma.calendarSync.create.mockResolvedValue({});

    await service.sync(userId, { calendarId: 'calendar-1' });

    expect(prisma.calendarSync.create).toHaveBeenCalledWith(
      matching<{ data: unknown }>({
        data: matching({
          status: 'FAILED',
          lastSync: null as Date | null,
          errorMessage: expect.stringContaining(
            'not yet implemented',
          ) as string,
        }),
      }),
    );
  });
});
