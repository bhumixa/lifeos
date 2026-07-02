import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const issuedSession = {
    accessToken: 'access-token',
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      avatarUrl: null,
      role: 'STANDARD' as const,
    },
    refreshToken: {
      raw: 'selector.secret',
      expiresAt: new Date(Date.now() + 1000),
    },
  };

  function makeRequest(cookies: Record<string, string> = {}): Request {
    return {
      cookies,
      get: jest.fn().mockReturnValue('jest-test-agent'),
    } as unknown as Request;
  }

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(issuedSession),
      login: jest.fn().mockResolvedValue(issuedSession),
      refresh: jest.fn().mockResolvedValue(issuedSession),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('development') },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register: sets the refresh cookie and returns the body without the raw refresh token', async () => {
    const result = await controller.register(
      { email: 'ada@example.com', password: 'Passw0rd1', name: 'Ada' },
      makeRequest(),
      res as unknown as Response,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'selector.secret',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth',
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      user: issuedSession.user,
    });
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('login: sets the refresh cookie', async () => {
    await controller.login(
      { email: 'ada@example.com', password: 'Passw0rd1' },
      makeRequest(),
      res as unknown as Response,
    );
    expect(res.cookie).toHaveBeenCalled();
  });

  it('refresh: reads the cookie, rotates it, and sets the new one', async () => {
    const result = await controller.refresh(
      makeRequest({ refresh_token: 'old-selector.old-secret' }),
      res as unknown as Response,
    );

    expect(authService.refresh).toHaveBeenCalledWith(
      'old-selector.old-secret',
      'jest-test-agent',
    );
    expect(res.cookie).toHaveBeenCalled();
    expect(result.accessToken).toBe('access-token');
  });

  it('refresh: rejects when no refresh cookie is present, without calling AuthService', async () => {
    await expect(
      controller.refresh(makeRequest(), res as unknown as Response),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('refresh: clears the cookie when AuthService rejects the token', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException('Invalid refresh token'),
    );

    await expect(
      controller.refresh(
        makeRequest({ refresh_token: 'bad.token' }),
        res as unknown as Response,
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('logout: revokes the token (if any) and always clears the cookie', async () => {
    const result = await controller.logout(
      makeRequest({ refresh_token: 'selector.secret' }),
      res as unknown as Response,
    );

    expect(authService.logout).toHaveBeenCalledWith('selector.secret');
    expect(res.clearCookie).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});
