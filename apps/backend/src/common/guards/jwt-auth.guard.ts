import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Thin named wrapper around Passport's 'jwt' strategy guard, so controllers depend on a
 * project-owned symbol (`JwtAuthGuard`) rather than a magic string strategy name.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
