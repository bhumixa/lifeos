import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Global so every feature module can inject PrismaService without each one
 * re-importing PrismaModule — standard pattern for the single DB connection
 * a modular monolith shares across all modules (see docs/05-architecture.md).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
