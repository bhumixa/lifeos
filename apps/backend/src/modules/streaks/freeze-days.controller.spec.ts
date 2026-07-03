import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { FreezeDaysController } from './freeze-days.controller.js';
import { FreezeDaysService } from './freeze-days.service.js';

describe('FreezeDaysController', () => {
  let controller: FreezeDaysController;
  let freezeDaysService: { use: jest.Mock };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  beforeEach(async () => {
    freezeDaysService = { use: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FreezeDaysController],
      providers: [{ provide: FreezeDaysService, useValue: freezeDaysService }],
    }).compile();

    controller = module.get(FreezeDaysController);
  });

  it('delegates use to FreezeDaysService.use with the current user and dto', async () => {
    freezeDaysService.use.mockResolvedValue({});
    const dto = { date: '2026-07-02' };
    await controller.use(currentUser, dto);
    expect(freezeDaysService.use).toHaveBeenCalledWith(currentUser.id, dto);
  });
});
