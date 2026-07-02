import type { Role } from '../../../generated/prisma/index.js';

/**
 * Shape of `request.user` after JwtAuthGuard runs. Lives in `common/` (rather than inside the
 * auth module) because RolesGuard and the @CurrentUser() decorator — both foundational,
 * cross-module pieces — depend on it without needing to depend on the auth module itself.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
