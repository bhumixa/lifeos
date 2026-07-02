import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/**
 * Injects the authenticated user attached by JwtAuthGuard, e.g. `@CurrentUser() user: AuthenticatedUser`.
 * Must only be used on routes guarded by JwtAuthGuard — otherwise `request.user` is undefined.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
