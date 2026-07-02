import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import type { EnvConfig } from './config/env.validation.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvConfig, true>);

  // Locked to the known frontend origin rather than a wildcard — see
  // "Security architecture" in docs/05-architecture.md. `credentials: true` is required for the
  // httpOnly refresh-token cookie to be sent/accepted cross-origin (localhost:4200 -> :3000).
  app.enableCors({
    origin: configService.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  // Required to read the refresh-token cookie in AuthController (req.cookies).
  app.use(cookieParser());

  // Every DTO is validated and stripped of unknown properties at the edge,
  // so controllers/services never see malformed input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Catches everything (not just HttpException) so every error response has the same shape.
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LifeOS AI API')
    .setDescription('LifeOS AI backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
