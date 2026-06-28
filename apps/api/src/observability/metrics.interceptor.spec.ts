import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { DomainException } from '../common/domain.exception';
import {
  isPaymentPath,
  MetricsInterceptor,
  routeLabel,
} from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { MetricsStore } from './metrics.store';

describe('routeLabel / isPaymentPath', () => {
  it('prefers the route pattern and strips the query', () => {
    expect(routeLabel({ method: 'GET', route: { path: '/campaigns/:id' } })).toBe(
      'GET /campaigns/:id',
    );
    expect(routeLabel({ method: 'POST', originalUrl: '/x?y=1' })).toBe('POST /x');
    expect(routeLabel({})).toBe('GET unknown');
  });

  it('detects payment paths', () => {
    expect(isPaymentPath('POST /campaigns/:id/donations/card')).toBe(true);
    expect(isPaymentPath('POST /payments/webhook')).toBe(true);
    expect(isPaymentPath('GET /campaigns')).toBe(false);
  });
});

function context(req: unknown, res: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsInterceptor', () => {
  function make() {
    const store = new MetricsStore();
    const metrics = new MetricsService(store);
    return { store, interceptor: new MetricsInterceptor(metrics) };
  }

  it('records a sample with the response status on success', (done) => {
    const { store, interceptor } = make();
    const ctx = context(
      { method: 'GET', route: { path: '/campaigns' }, requestId: 'req_abc12345' },
      { statusCode: 200 },
    );
    const handler: CallHandler = { handle: () => of({ ok: true }) };
    interceptor.intercept(ctx, handler).subscribe(() => {
      const s = store.samples();
      expect(s).toHaveLength(1);
      expect(s[0].statusCode).toBe(200);
      expect(s[0].route).toBe('GET /campaigns');
      done();
    });
  });

  it('records the HttpException status on error and rethrows', (done) => {
    const { store, interceptor } = make();
    const ctx = context(
      { method: 'POST', route: { path: '/campaigns/:id/donations/card' } },
      {},
    );
    const handler: CallHandler = {
      handle: () => throwError(() => new DomainException('PAYMENT_FAILED', 'no', 402)),
    };
    interceptor.intercept(ctx, handler).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(DomainException);
        const s = store.samples();
        expect(s[0].statusCode).toBe(402);
        expect(s[0].isPaymentPath).toBe(true);
        done();
      },
    });
  });

  it('defaults a missing success status to 200', (done) => {
    const { store, interceptor } = make();
    const ctx = context({ method: 'GET', originalUrl: '/health' }, {});
    const handler: CallHandler = { handle: () => of('ok') };
    interceptor.intercept(ctx, handler).subscribe(() => {
      expect(store.samples()[0].statusCode).toBe(200);
      done();
    });
  });
});
