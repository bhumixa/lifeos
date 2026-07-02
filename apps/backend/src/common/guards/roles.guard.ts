import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../../generated/prisma/index.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/**
 * Must run after JwtAuthGuard (see usage: `@UseGuards(JwtAuthGuard, RolesGuard)`) so
 * `request.user` is already populated. Routes without an @Roles() decorator are allowed
 * through — RolesGuard only restricts routes that explicitly opt in.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return requiredRoles.includes(user.role);
  }
}
