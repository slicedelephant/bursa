import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { redact } from '../security/pii-redact';
import { MetricsService } from './metrics.service';

interface ReqLike {
  method?: string;
  url?: string;
  originalUrl?: string;
  route?: { path?: string };
  requestId?: string;
  headers?: Record<string, unknown>;
}

interface ResLike {
  statusCode?: number;
}

/** Best-effort low-cardinality route label (pattern over raw URL, query stripped). */
export function routeLabel(req: ReqLike): string {
  const path =
    req.route?.path ?? (req.originalUrl ?? req.url ?? 'unknown').split('?')[0];
  return `${req.method ?? 'GET'} ${path}`;
}

export function isPaymentPath(label: string): boolean {
  return label.includes('/donations/') || label.includes('/payments/webhook');
}

function statusFromError(error: unknown): number {
  return error instanceof HttpException ? error.getStatus() : 500;
}

/**
 * Global, read-only request instrumentation. Measures latency, captures the final
 * status (default on success, the HttpException status on error) and records one
 * RequestSample per request, plus a PII-redacted structured log line carrying the
 * correlation id. Never alters the response and never swallows errors.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('obs');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<ReqLike>();
    const res = http.getResponse<ResLike>();
    const start = Date.now();
    const label = routeLabel(req);
    const payment = isPaymentPath(label);
    const requestId =
      req.requestId ?? (req.headers?.['x-request-id'] as string | undefined);

    const finish = (status: number): void => {
      const durationMs = Date.now() - start;
      this.metrics.record({
        route: label,
        method: req.method ?? 'GET',
        statusCode: status,
        durationMs,
        isPaymentPath: payment,
        timestamp: Date.now(),
      });
      this.logger.log(
        JSON.stringify(redact({ requestId, route: label, status, durationMs })),
      );
    };

    return next.handle().pipe(
      tap({
        next: () => finish(res.statusCode ?? 200),
        error: (err) => finish(statusFromError(err)),
      }),
    );
  }
}
