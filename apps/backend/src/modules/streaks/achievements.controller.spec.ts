import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { AchievementsController } from './achievements.controller.js';
import { AchievementsService } from './achievements.service.js';

describe('AchievementsController', () => {
  let controller: AchievementsController;
  let achievementsService: { getAll: jest.Mock; getUnlocked: jest.Mock };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  beforeEach(async () => {
    achievementsService = { getAll: jest.fn(), getUnlocked: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchievementsController],
      providers: [
        { provide: AchievementsService, useValue: achievementsService },
      ],
    }).compile();

    controller = module.get(AchievementsController);
  });

  it('delegates findAll to AchievementsService.getAll for the current user', async () => {
    achievementsService.getAll.mockResolvedValue([]);
    await controller.findAll(currentUser);
    expect(achievementsService.getAll).toHaveBeenCalledWith(currentUser.id);
  });

  it('delegates findUnlocked to AchievementsService.getUnlocked for the current user', async () => {
    achievementsService.getUnlocked.mockResolvedValue([]);
    await controller.findUnlocked(currentUser);
    expect(achievementsService.getUnlocked).toHaveBeenCalledWith(
      currentUser.id,
    );
  });
});
