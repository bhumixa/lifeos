import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { PlannerBlockType } from '../../../generated/prisma/index.js';
import { PlannerController } from './planner.controller.js';
import { PlannerService } from './planner.service.js';

describe('PlannerController', () => {
  let controller: PlannerController;
  let plannerService: {
    today: jest.Mock;
    getByDate: jest.Mock;
    createBlock: jest.Mock;
    updateBlock: jest.Mock;
    removeBlock: jest.Mock;
    generate: jest.Mock;
    reorder: jest.Mock;
    complete: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };
  const mockDay = { id: 'day-1', date: '2026-07-03', notes: null, blocks: [] };

  beforeEach(async () => {
    plannerService = {
      today: jest.fn(),
      getByDate: jest.fn(),
      createBlock: jest.fn(),
      updateBlock: jest.fn(),
      removeBlock: jest.fn(),
      generate: jest.fn(),
      reorder: jest.fn(),
      complete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlannerController],
      providers: [{ provide: PlannerService, useValue: plannerService }],
    }).compile();

    controller = module.get(PlannerController);
  });

  it('today delegates to PlannerService with the current user id', async () => {
    plannerService.today.mockResolvedValue(mockDay);

    const result = await controller.today(currentUser);

    expect(plannerService.today).toHaveBeenCalledWith(currentUser.id);
    expect(result).toBe(mockDay);
  });

  it('getByDate delegates to PlannerService with the current user id and date', async () => {
    plannerService.getByDate.mockResolvedValue(mockDay);

    const result = await controller.getByDate(currentUser, '2026-07-03');

    expect(plannerService.getByDate).toHaveBeenCalledWith(
      currentUser.id,
      '2026-07-03',
    );
    expect(result).toBe(mockDay);
  });

  it('createBlock delegates to PlannerService with the current user id', async () => {
    plannerService.createBlock.mockResolvedValue(mockDay);
    const dto = {
      type: PlannerBlockType.FOCUS,
      title: 'Deep work',
      startTime: '2026-07-03T09:00:00.000Z',
      endTime: '2026-07-03T10:00:00.000Z',
    };

    const result = await controller.createBlock(currentUser, dto);

    expect(plannerService.createBlock).toHaveBeenCalledWith(
      currentUser.id,
      dto,
    );
    expect(result).toBe(mockDay);
  });

  it('updateBlock delegates to PlannerService with the current user id and block id', async () => {
    plannerService.updateBlock.mockResolvedValue(mockDay);

    const result = await controller.updateBlock(currentUser, 'block-1', {
      title: 'Updated',
    });

    expect(plannerService.updateBlock).toHaveBeenCalledWith(
      currentUser.id,
      'block-1',
      { title: 'Updated' },
    );
    expect(result).toBe(mockDay);
  });

  it('removeBlock delegates to PlannerService with the current user id and block id', async () => {
    plannerService.removeBlock.mockResolvedValue(undefined);

    await controller.removeBlock(currentUser, 'block-1');

    expect(plannerService.removeBlock).toHaveBeenCalledWith(
      currentUser.id,
      'block-1',
    );
  });

  it('generate delegates to PlannerService with the current user id', async () => {
    plannerService.generate.mockResolvedValue({
      ...mockDay,
      unscheduledTaskIds: [],
      unscheduledHabitIds: [],
    });

    const result = await controller.generate(currentUser, {
      date: '2026-07-03',
    });

    expect(plannerService.generate).toHaveBeenCalledWith(currentUser.id, {
      date: '2026-07-03',
    });
    expect(result.unscheduledTaskIds).toEqual([]);
  });

  it('reorder delegates to PlannerService with the current user id', async () => {
    plannerService.reorder.mockResolvedValue(mockDay);
    const dto = { date: '2026-07-03', blockIds: ['b1', 'b2'] };

    const result = await controller.reorder(currentUser, dto);

    expect(plannerService.reorder).toHaveBeenCalledWith(currentUser.id, dto);
    expect(result).toBe(mockDay);
  });

  it('complete delegates to PlannerService with the current user id', async () => {
    plannerService.complete.mockResolvedValue(mockDay);
    const dto = { blockId: 'block-1' };

    const result = await controller.complete(currentUser, dto);

    expect(plannerService.complete).toHaveBeenCalledWith(currentUser.id, dto);
    expect(result).toBe(mockDay);
  });
});
