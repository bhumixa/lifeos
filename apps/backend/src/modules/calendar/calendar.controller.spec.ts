import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { CalendarEventsService } from './calendar-events.service.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';

describe('CalendarController', () => {
  let controller: CalendarController;
  let calendarService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let calendarEventsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let calendarSyncService: { sync: jest.Mock };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  beforeEach(async () => {
    calendarService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    calendarEventsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    calendarSyncService = { sync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: calendarService },
        { provide: CalendarEventsService, useValue: calendarEventsService },
        { provide: CalendarSyncService, useValue: calendarSyncService },
      ],
    }).compile();

    controller = module.get(CalendarController);
  });

  it('findAll delegates to CalendarService.findAll with the requesting user', async () => {
    calendarService.findAll.mockResolvedValue([]);

    await controller.findAll(currentUser, {});

    expect(calendarService.findAll).toHaveBeenCalledWith(currentUser.id, {});
  });

  it('create delegates to CalendarService.create', async () => {
    calendarService.create.mockResolvedValue({});

    const dto = { name: 'Personal', color: '#3F51B5' };
    await controller.create(currentUser, dto);

    expect(calendarService.create).toHaveBeenCalledWith(currentUser.id, dto);
  });

  it('findAllEvents delegates to CalendarEventsService.findAll (not swallowed by findOne)', async () => {
    calendarEventsService.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAllEvents(currentUser, {});

    expect(calendarEventsService.findAll).toHaveBeenCalledWith(
      currentUser.id,
      {},
    );
    expect(calendarService.findOne).not.toHaveBeenCalled();
  });

  it('createEvent delegates to CalendarEventsService.create', async () => {
    calendarEventsService.create.mockResolvedValue({});
    const dto = {
      calendarId: 'calendar-1',
      title: 'Dentist',
      startTime: '2026-07-06T14:00:00.000Z',
      endTime: '2026-07-06T15:00:00.000Z',
    };

    await controller.createEvent(currentUser, dto);

    expect(calendarEventsService.create).toHaveBeenCalledWith(
      currentUser.id,
      dto,
    );
  });

  it('sync delegates to CalendarSyncService.sync (not swallowed by findOne)', async () => {
    calendarSyncService.sync.mockResolvedValue({});

    await controller.sync(currentUser, { calendarId: 'calendar-1' });

    expect(calendarSyncService.sync).toHaveBeenCalledWith(currentUser.id, {
      calendarId: 'calendar-1',
    });
    expect(calendarService.findOne).not.toHaveBeenCalled();
  });

  it('findOne delegates to CalendarService.findOne', async () => {
    calendarService.findOne.mockResolvedValue({});

    await controller.findOne(currentUser, 'calendar-1');

    expect(calendarService.findOne).toHaveBeenCalledWith(
      currentUser.id,
      'calendar-1',
    );
  });

  it('remove delegates to CalendarService.remove', async () => {
    calendarService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, 'calendar-1');

    expect(calendarService.remove).toHaveBeenCalledWith(
      currentUser.id,
      'calendar-1',
    );
  });
});
