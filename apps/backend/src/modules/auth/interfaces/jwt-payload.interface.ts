import type { Role } from '../../../../generated/prisma/index.js';

/** Claims encoded into the short-lived access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
