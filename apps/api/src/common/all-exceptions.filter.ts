import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { redact } from '../security/pii-redact';

const STATUS_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

/** Emits every error as `{ success: false, error: { code, message, details? } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Unexpected error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        message = Array.isArray(b.message)
          ? (b.message as string[]).join('; ')
          : ((b.message as string) ?? message);
        code = (b.code as string) ?? STATUS_CODE[status] ?? 'ERROR';
        details =
          b.details ?? (Array.isArray(b.message) ? b.message : undefined);
      }
      if (code === 'INTERNAL_ERROR') code = STATUS_CODE[status] ?? 'ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      // Redact PII (emails, tokens, card/IBAN numbers) before it reaches logs.
      this.logger.error(redact(exception.message) as string, exception.stack);
    }

    response
      .status(status)
      .json({ success: false, error: { code, message, details } });
  }
}
