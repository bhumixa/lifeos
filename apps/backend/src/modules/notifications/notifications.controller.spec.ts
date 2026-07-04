import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Role } from '../../../generated/prisma/index.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: Record<string, jest.Mock>;
  let preferencesService: Record<string, jest.Mock>;

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'a@example.com',
    role: Role.STANDARD,
  };

  beforeEach(async () => {
    notificationsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findUnread: jest.fn().mockResolvedValue([]),
      markRead: jest.fn().mockResolvedValue({}),
      markAllRead: jest.fn().mockResolvedValue({ updatedCount: 0 }),
      dismiss: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    preferencesService = {
      getOrCreate: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsService },
        {
          provide: NotificationPreferencesService,
          useValue: preferencesService,
        },
      ],
    }).compile();

    controller = module.get(NotificationsController);
  });

  it('findAll delegates to NotificationsService.findAll scoped to the current user', async () => {
    await controller.findAll(user, { page: 1, pageSize: 20 });
    expect(notificationsService.findAll).toHaveBeenCalledWith(user.id, {
      page: 1,
      pageSize: 20,
    });
  });

  it('findUnread delegates to NotificationsService.findUnread', async () => {
    await controller.findUnread(user);
    expect(notificationsService.findUnread).toHaveBeenCalledWith(user.id);
  });

  it('getPreferences delegates to NotificationPreferencesService.getOrCreate', async () => {
    await controller.getPreferences(user);
    expect(preferencesService.getOrCreate).toHaveBeenCalledWith(user.id);
  });

  it('updatePreferences delegates to NotificationPreferencesService.update', async () => {
    await controller.updatePreferences(user, { enableEmail: true });
    expect(preferencesService.update).toHaveBeenCalledWith(user.id, {
      enableEmail: true,
    });
  });

  it('markRead delegates to NotificationsService.markRead', async () => {
    await controller.markRead(user, 'notif-1');
    expect(notificationsService.markRead).toHaveBeenCalledWith(
      user.id,
      'notif-1',
    );
  });

  it('markAllRead delegates to NotificationsService.markAllRead', async () => {
    await controller.markAllRead(user);
    expect(notificationsService.markAllRead).toHaveBeenCalledWith(user.id);
  });

  it('dismiss delegates to NotificationsService.dismiss', async () => {
    await controller.dismiss(user, 'notif-1');
    expect(notificationsService.dismiss).toHaveBeenCalledWith(
      user.id,
      'notif-1',
    );
  });

  it('remove delegates to NotificationsService.remove', async () => {
    await controller.remove(user, 'notif-1');
    expect(notificationsService.remove).toHaveBeenCalledWith(
      user.id,
      'notif-1',
    );
  });
});
