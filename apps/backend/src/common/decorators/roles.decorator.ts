import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../../generated/prisma/index.js';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring one of the given roles. Read by RolesGuard, which runs after
 * JwtAuthGuard so `request.user.role` is already populated.
 */
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
