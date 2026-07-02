import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
  error: string;
}

/**
 * Catches everything (not just HttpException) so the API never leaks a raw stack trace or an
 * inconsistent error shape to clients. class-validator's ValidationPipe throws a
 * BadRequestException whose `message` is already a string[] of field errors — that array is
 * passed through as-is rather than flattened, so the frontend can map errors per field.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } =
      this.resolveExceptionShape(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      error,
    };

    response.status(statusCode).json(body);
  }

  private resolveExceptionShape(exception: unknown): {
    statusCode: HttpStatus;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const { message, error } = response as {
          message: string | string[];
          error?: string;
        };
        return {
          statusCode: exception.getStatus(),
          message,
          error: error ?? exception.name,
        };
      }
      return {
        statusCode: exception.getStatus(),
        message: exception.message,
        error: exception.name,
      };
    }

    // Anything else is unexpected — never echo internal error details to the client.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
