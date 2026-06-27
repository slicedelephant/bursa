import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from '../common/domain.exception';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from './rate-limit.decorator';
import { RateLimitStore } from './rate-limit.store';

/** Resolves the best-effort client IP from proxy headers or the socket. */
export function clientIp(request: {
  headers?: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}

/**
 * Enforces the per-route fixed-window rate limit. Routes without a `@RateLimit`
 * annotation pass through untouched. Over the limit returns 429 RATE_LIMITED in
 * the standard envelope with Retry-After / X-RateLimit-* headers.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly store: RateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const bucket = options.name ?? context.getHandler().name;
    const key = `${bucket}:${clientIp(request)}`;
    const decision = this.store.hit(
      key,
      options.limit,
      options.windowMs,
      Date.now(),
    );

    if (typeof response?.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', String(decision.limit));
      response.setHeader('X-RateLimit-Remaining', String(decision.remaining));
      response.setHeader(
        'X-RateLimit-Reset',
        String(Math.ceil(decision.resetAt / 1000)),
      );
    }

    if (!decision.allowed) {
      if (typeof response?.setHeader === 'function') {
        response.setHeader('Retry-After', String(decision.retryAfterSec));
      }
      throw new DomainException(
        'RATE_LIMITED',
        'Too many requests, please try again later.',
        429,
      );
    }

    return true;
  }
}
