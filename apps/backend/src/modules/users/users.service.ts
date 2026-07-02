import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@lifeos/shared-types';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { User } from '../../../generated/prisma/index.js';

/**
 * Owns all User persistence. AuthService depends on this rather than touching PrismaService
 * directly for User rows, so "how a user is looked up/created" has one implementation.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
