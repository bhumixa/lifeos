import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { User } from '../../../generated/prisma/index.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { findById: jest.Mock; toAuthUser: jest.Mock };

  const mockUser: User = {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hashed',
    googleId: null,
    name: 'Ada Lovelace',
    avatarUrl: null,
    role: 'STANDARD',
    timezone: 'UTC',
    locale: 'en',
    emailVerifiedAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
      toAuthUser: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('returns the current user profile, re-read from the database', async () => {
    usersService.findById.mockResolvedValue(mockUser);

    const result = await controller.me({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });

    expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      avatarUrl: mockUser.avatarUrl,
      role: mockUser.role,
    });
  });

  it('throws NotFoundException if the user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      controller.me({
        id: 'deleted-user',
        email: 'gone@example.com',
        role: 'STANDARD',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
