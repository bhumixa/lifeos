import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import type { EnvConfig } from '../../../config/env.validation.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

/**
 * Validates the `Authorization: Bearer <accessToken>` header. Deliberately stateless — it
 * trusts the JWT signature and does not hit the database, so authenticated requests stay cheap.
 * The refresh flow (which does touch the database) is what makes revocation possible despite this.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<EnvConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
