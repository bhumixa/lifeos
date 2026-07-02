import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { EnvConfig } from './config/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  // Locked to the known frontend origin rather than a wildcard — see
  // "Security architecture" in docs/05-architecture.md.
  app.enableCors({
    origin: configService.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  // Every DTO is validated and stripped of unknown properties at the edge,
  // so controllers/services never see malformed input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
