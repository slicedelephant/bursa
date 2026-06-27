import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional bucket name; defaults to the handler name. Groups related routes. */
  name?: string;
}

/**
 * Annotates a route with a fixed-window rate limit enforced by RateLimitGuard.
 * Example: `@RateLimit({ limit: 5, windowMs: 60_000, name: 'login' })`.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
