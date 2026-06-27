import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { clientIp, RateLimitGuard } from './rate-limit.guard';
import { RateLimitOptions } from './rate-limit.decorator';
import { RateLimitStore } from './rate-limit.store';

function harness(options: RateLimitOptions | undefined) {
  const store = new RateLimitStore();
  const reflector = {
    getAllAndOverride: () => options,
  } as unknown as Reflector;
  const guard = new RateLimitGuard(reflector, store);

  const make = (ip: string) => {
    const headers: Record<string, string> = {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-forwarded-for': ip }, ip }),
        getResponse: () => ({
          setHeader: (k: string, v: string) => {
            headers[k] = v;
          },
        }),
      }),
      getHandler: () => ({ name: 'handler' }),
      getClass: () => ({ name: 'Controller' }),
    } as unknown as ExecutionContext;
    return { context, headers };
  };

  return { guard, make };
}

describe('clientIp', () => {
  it('prefers the first x-forwarded-for entry', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } })).toBe(
      '9.9.9.9',
    );
  });

  it('falls back to req.ip then socket then unknown', () => {
    expect(clientIp({ ip: '5.5.5.5' })).toBe('5.5.5.5');
    expect(clientIp({ socket: { remoteAddress: '6.6.6.6' } })).toBe('6.6.6.6');
    expect(clientIp({})).toBe('unknown');
  });
});

describe('RateLimitGuard', () => {
  it('passes through routes without a rate-limit annotation', () => {
    const { guard, make } = harness(undefined);
    const { context } = make('1.2.3.4');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows requests within the limit and sets headers', () => {
    const { guard, make } = harness({ limit: 2, windowMs: 60_000 });
    const { context, headers } = make('1.2.3.4');
    expect(guard.canActivate(context)).toBe(true);
    expect(headers['X-RateLimit-Limit']).toBe('2');
    expect(headers['X-RateLimit-Remaining']).toBe('1');
  });

  it('throws 429 once the limit is exceeded', () => {
    const { guard, make } = harness({ limit: 1, windowMs: 60_000 });
    const first = make('1.2.3.4');
    expect(guard.canActivate(first.context)).toBe(true);

    const second = make('1.2.3.4');
    let thrown: any;
    try {
      guard.canActivate(second.context);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect(thrown.getStatus()).toBe(429);
    expect(second.headers['Retry-After']).toBeDefined();
  });

  it('keeps separate buckets per IP', () => {
    const { guard, make } = harness({ limit: 1, windowMs: 60_000 });
    expect(guard.canActivate(make('1.1.1.1').context)).toBe(true);
    expect(() => guard.canActivate(make('1.1.1.1').context)).toThrow();
    expect(guard.canActivate(make('2.2.2.2').context)).toBe(true);
  });
});
