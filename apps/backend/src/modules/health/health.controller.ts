import { Controller, Get } from '@nestjs/common';
import type { HealthCheckResponse } from '@lifeos/shared-types';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }
}
