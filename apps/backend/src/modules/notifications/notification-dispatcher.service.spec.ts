import { Test, TestingModule } from '@nestjs/testing';
import type {
  Notification,
  NotificationPreference,
} from '../../../generated/prisma/index.js';
import { NotificationChannelRegistry } from './channels/notification-channel.registry.js';
import { NotificationDispatcherService } from './notification-dispatcher.service.js';

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;
  let registry: { resolve: jest.Mock };

  const notification = { id: 'notif-1' } as Notification;

  const basePreference: NotificationPreference = {
    id: 'pref-1',
    userId: 'user-1',
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
    enableTasks: true,
    enableHabits: true,
    enablePlanner: true,
    enableGoals: true,
    enableJournal: true,
    enableCalendar: true,
    enableStreaks: true,
    enableAchievements: true,
    enableEmail: false,
    enablePush: false,
    enableInApp: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    registry = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        { provide: NotificationChannelRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(NotificationDispatcherService);
  });

  describe('resolveChannels — channel routing', () => {
    it('always includes IN_APP, regardless of preference', () => {
      expect(service.resolveChannels(basePreference)).toEqual(['IN_APP']);
    });

    it('adds EMAIL only when enableEmail is true', () => {
      expect(
        service.resolveChannels({ ...basePreference, enableEmail: true }),
      ).toEqual(['IN_APP', 'EMAIL']);
    });

    it('adds PUSH only when enablePush is true', () => {
      expect(
        service.resolveChannels({ ...basePreference, enablePush: true }),
      ).toEqual(['IN_APP', 'PUSH']);
    });

    it('adds both EMAIL and PUSH when both are enabled', () => {
      expect(
        service.resolveChannels({
          ...basePreference,
          enableEmail: true,
          enablePush: true,
        }),
      ).toEqual(['IN_APP', 'EMAIL', 'PUSH']);
    });
  });

  describe('dispatch', () => {
    it('succeeds overall when the only attempted channel (IN_APP) succeeds', async () => {
      registry.resolve.mockReturnValue({
        send: jest.fn().mockResolvedValue({ channel: 'IN_APP', success: true }),
      });

      const result = await service.dispatch(notification, basePreference);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([{ channel: 'IN_APP', success: true }]);
    });

    it('still reports overall success when IN_APP succeeds even if a placeholder channel fails', async () => {
      registry.resolve.mockImplementation((type: string) => ({
        send: jest.fn().mockResolvedValue(
          type === 'IN_APP'
            ? { channel: 'IN_APP', success: true }
            : {
                channel: type,
                success: false,
                error: 'NOT_IMPLEMENTED: Email delivery is not yet implemented',
              },
        ),
      }));

      const result = await service.dispatch(notification, {
        ...basePreference,
        enableEmail: true,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results.find((r) => r.channel === 'EMAIL')?.success).toBe(
        false,
      );
    });

    it('reports overall failure when every attempted channel fails', async () => {
      registry.resolve.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          channel: 'IN_APP',
          success: false,
          error: 'boom',
        }),
      });

      const result = await service.dispatch(notification, basePreference);

      expect(result.success).toBe(false);
    });
  });
});
