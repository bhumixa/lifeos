import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { AuthResponse } from '@lifeos/shared-types';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { EnvConfig } from '../../config/env.validation.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import type { User } from '../../../generated/prisma/index.js';

/** A rotated refresh token, ready to be set as an httpOnly cookie. */
interface IssuedRefreshToken {
  /** `${RefreshToken.id}.${secret}` — see the class doc for why it's shaped this way. */
  raw: string;
  expiresAt: Date;
}

// Dummy hash compared against on a login attempt for an unknown email, so the bcrypt.compare
// cost is paid either way and response timing doesn't reveal whether the account exists.
// Computed once at module load (not a hardcoded literal) to guarantee a well-formed hash;
// its plaintext is irrelevant since it's never meant to match a real password.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async register(
    dto: RegisterDto,
    deviceInfo?: string,
  ): Promise<AuthResponse & { refreshToken: IssuedRefreshToken }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const saltRounds = this.configService.get('BCRYPT_SALT_ROUNDS', {
      infer: true,
    });
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    return this.issueSession(user, deviceInfo);
  }

  async login(
    dto: LoginDto,
    deviceInfo?: string,
  ): Promise<AuthResponse & { refreshToken: IssuedRefreshToken }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Always run a bcrypt.compare, even for an unknown email, so the two failure paths take
    // roughly the same time and can't be used to enumerate registered emails.
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_BCRYPT_HASH,
    );

    if (!user || !user.passwordHash || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been disabled');
    }

    return this.issueSession(user, deviceInfo);
  }

  /**
   * Verifies the current refresh token, revokes it, and issues a brand new access/refresh pair
   * (rotation) — so a stolen refresh token that gets reused after the legitimate client rotates
   * it is immediately detectable as invalid (already revoked).
   */
  async refresh(
    rawToken: string,
    deviceInfo?: string,
  ): Promise<AuthResponse & { refreshToken: IssuedRefreshToken }> {
    const tokenRecord = await this.verifyRefreshToken(rawToken);

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return this.issueSession(user, deviceInfo);
  }

  /** Best-effort revoke — logout succeeds even if the token was already invalid/missing. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    try {
      const tokenRecord = await this.verifyRefreshToken(rawToken);
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Already invalid/expired/revoked — nothing to do.
    }
  }

  private async issueSession(
    user: User,
    deviceInfo?: string,
  ): Promise<AuthResponse & { refreshToken: IssuedRefreshToken }> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, deviceInfo);

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toAuthUser(user),
    };
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', {
        infer: true,
      }),
    });
  }

  private async createRefreshToken(
    userId: string,
    deviceInfo?: string,
  ): Promise<IssuedRefreshToken> {
    const saltRounds = this.configService.get('BCRYPT_SALT_ROUNDS', {
      infer: true,
    });
    const ttlDays = this.configService.get('JWT_REFRESH_TOKEN_TTL_DAYS', {
      infer: true,
    });

    const secret = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(secret, saltRounds);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const row = await this.prisma.refreshToken.create({
      data: { userId, tokenHash, deviceInfo, expiresAt },
    });

    // Selector/verifier pattern: `id` is an indexed, non-secret lookup key; `secret` is the part
    // proven via bcrypt.compare. This is what makes "store the hash, not the raw token" (per
    // docs/05-architecture.md) compatible with an O(1) database lookup on refresh.
    return { raw: `${row.id}.${secret}`, expiresAt };
  }

  private async verifyRefreshToken(
    rawToken: string,
  ): Promise<{ id: string; userId: string }> {
    const [id, secret] = rawToken.split('.');
    if (!id || !secret) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id },
    });
    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(secret, tokenRecord.tokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { id: tokenRecord.id, userId: tokenRecord.userId };
  }
}
