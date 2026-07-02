import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthResponse } from '@lifeos/shared-types';
import type { EnvConfig } from '../../config/env.validation.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create a new account and start a session.' })
  @ApiCreatedResponse({
    description:
      'Account created. Access token is returned in the body; refresh token is set as an httpOnly cookie.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.register(
      dto,
      req.get('user-agent'),
    );
    this.setRefreshCookie(res, refreshToken.raw, refreshToken.expiresAt);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with email and password, and start a session.',
  })
  @ApiOkResponse({
    description:
      'Access token is returned in the body; refresh token is set as an httpOnly cookie.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...result } = await this.authService.login(
      dto,
      req.get('user-agent'),
    );
    this.setRefreshCookie(res, refreshToken.raw, refreshToken.expiresAt);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exchange the refresh token cookie for a new access/refresh pair (rotation).',
  })
  @ApiOkResponse({
    description:
      'A new access token is returned; the refresh cookie is rotated.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const rawToken = this.readRefreshCookie(req);
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      const { refreshToken, ...result } = await this.authService.refresh(
        rawToken,
        req.get('user-agent'),
      );
      this.setRefreshCookie(res, refreshToken.raw, refreshToken.expiresAt);
      return result;
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the current refresh token and end the session.',
  })
  @ApiOkResponse({ description: 'Session ended.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(this.readRefreshCookie(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as
      Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private baseCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      // 'none' is required for the cross-site Cloudflare Pages <-> Railway topology in production
      // (docs/05-architecture.md); 'lax' is sufficient — and doesn't require the Secure flag — for
      // local dev, where frontend and backend are both on `localhost`.
      sameSite: isProduction ? 'none' : 'lax',
      path: '/auth',
    };
  }

  private setRefreshCookie(
    res: Response,
    rawToken: string,
    expiresAt: Date,
  ): void {
    res.cookie(REFRESH_TOKEN_COOKIE, rawToken, {
      ...this.baseCookieOptions(),
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.baseCookieOptions());
  }
}
