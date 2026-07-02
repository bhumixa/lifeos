import { Injectable, Logger } from '@nestjs/common';
import type { HealthCheckResponse } from '@lifeos/shared-types';
import { PrismaService } from '../../database/prisma/prisma.service.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResponse> {
    const database = await this.pingDatabase();

    return {
      status: database === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database,
    };
  }

  private async pingDatabase(): Promise<'connected' | 'disconnected'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : error,
      );
      return 'disconnected';
    }
  }
}
