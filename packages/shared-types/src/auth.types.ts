/**
 * Mirrors the Prisma `Role` enum. Duplicated (not imported from the generated Prisma client)
 * because shared-types must stay consumable by the frontend, which never depends on Prisma.
 */
export type Role = 'STANDARD' | 'PREMIUM' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
