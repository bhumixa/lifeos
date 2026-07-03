import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { StreaksController } from './streaks.controller.js';
import { StreaksService } from './streaks.service.js';

describe('StreaksController', () => {
  let controller: StreaksController;
  let streaksService: {
    getOverview: jest.Mock;
    getToday: jest.Mock;
    getStatistics: jest.Mock;
    getHabitStreak: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  beforeEach(async () => {
    streaksService = {
      getOverview: jest.fn(),
      getToday: jest.fn(),
      getStatistics: jest.fn(),
      getHabitStreak: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreaksController],
      providers: [{ provide: StreaksService, useValue: streaksService }],
    }).compile();

    controller = module.get(StreaksController);
  });

  it('delegates overview to StreaksService.getOverview for the current user', async () => {
    streaksService.getOverview.mockResolvedValue({ hasDailyHabits: false });
    await controller.overview(currentUser);
    expect(streaksService.getOverview).toHaveBeenCalledWith(currentUser.id);
  });

  it('delegates today to StreaksService.getToday for the current user', async () => {
    streaksService.getToday.mockResolvedValue({});
    await controller.today(currentUser);
    expect(streaksService.getToday).toHaveBeenCalledWith(currentUser.id);
  });

  it('delegates statistics to StreaksService.getStatistics for the current user', async () => {
    streaksService.getStatistics.mockResolvedValue({});
    await controller.statistics(currentUser);
    expect(streaksService.getStatistics).toHaveBeenCalledWith(currentUser.id);
  });

  it('delegates habitStreak to StreaksService.getHabitStreak with the current user and habitId', async () => {
    streaksService.getHabitStreak.mockResolvedValue({});
    await controller.habitStreak(currentUser, 'habit-1');
    expect(streaksService.getHabitStreak).toHaveBeenCalledWith(
      currentUser.id,
      'habit-1',
    );
  });
});
