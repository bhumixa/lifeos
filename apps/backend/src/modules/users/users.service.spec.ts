import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UsersService } from './users.service.js';
import type { User } from '../../../generated/prisma/index.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };

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
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('finds a user by email', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByEmail(mockUser.email);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: mockUser.email },
    });
    expect(result).toBe(mockUser);
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findById(mockUser.id);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUser.id },
    });
    expect(result).toBe(mockUser);
  });

  it('creates a user', async () => {
    prisma.user.create.mockResolvedValue(mockUser);

    const result = await service.create({
      email: mockUser.email,
      passwordHash: 'hashed',
      name: mockUser.name,
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: mockUser.email,
        passwordHash: 'hashed',
        name: mockUser.name,
      },
    });
    expect(result).toBe(mockUser);
  });

  it('maps a User record to the public AuthUser shape, dropping sensitive fields', () => {
    const authUser = service.toAuthUser(mockUser);

    expect(authUser).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      avatarUrl: mockUser.avatarUrl,
      role: mockUser.role,
    });
    expect(authUser).not.toHaveProperty('passwordHash');
  });
});
