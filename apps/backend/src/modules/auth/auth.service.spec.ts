import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { User } from '../../../generated/prisma/index.js';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let usersService: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    toAuthUser: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const mockUser: User = {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'stored-hash',
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

  const configValues: Record<string, unknown> = {
    BCRYPT_SALT_ROUNDS: 12,
    JWT_ACCESS_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_TOKEN_TTL_DAYS: 30,
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toAuthUser: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      })),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => configValues[key]) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma.refreshToken.create.mockResolvedValue({
      id: 'refresh-token-1',
      expiresAt: new Date(Date.now() + 1000),
    });
  });

  describe('register', () => {
    it('creates the user, hashes the password, and issues an access + refresh token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: mockUser.email,
        password: 'Passw0rd1',
        name: mockUser.name,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Passw0rd1', 12);
      expect(usersService.create).toHaveBeenCalledWith({
        email: mockUser.email,
        passwordHash: 'hashed-password',
        name: mockUser.name,
      });
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken.raw.startsWith('refresh-token-1.')).toBe(true);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('rejects an email that is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: mockUser.email,
          password: 'Passw0rd1',
          name: 'Someone',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues tokens for correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: mockUser.email,
        password: 'Passw0rd1',
      });

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('rejects an incorrect password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('still runs a bcrypt comparison for an unknown email, to avoid leaking account existence via timing', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('rejects a disabled account even with the correct password', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: mockUser.email, password: 'Passw0rd1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validTokenRecord = {
      id: 'refresh-token-old',
      userId: mockUser.id,
      tokenHash: 'stored-hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1_000_000),
    };

    it('rotates a valid refresh token: revokes the old one and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(validTokenRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.update.mockResolvedValue({});
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh('refresh-token-old.secret');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-old' },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken.raw.startsWith('refresh-token-1.')).toBe(true);
    });

    it('rejects a malformed token', async () => {
      await expect(
        service.refresh('not-a-selector-verifier-pair'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('rejects an unknown token id', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('unknown-id.secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an already-revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validTokenRecord,
        revokedAt: new Date(),
      });
      await expect(service.refresh('refresh-token-old.secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validTokenRecord,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('refresh-token-old.secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the secret does not match the stored hash', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(validTokenRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.refresh('refresh-token-old.wrong-secret'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes a valid token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-token-old',
        userId: mockUser.id,
        tokenHash: 'stored-hash',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1_000_000),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.update.mockResolvedValue({});

      await expect(
        service.logout('refresh-token-old.secret'),
      ).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-old' },
        data: { revokedAt: expect.any(Date) as Date },
      });
    });

    it('is a no-op when no token is provided', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('does not throw for an already-invalid token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.logout('bad.token')).resolves.toBeUndefined();
    });
  });
});
