import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { StripeWebhookGuard } from './stripe-webhook.guard';

const SECRET = 'whsec_test';
const BODY = '{"id":"evt_1","type":"ping"}';

function header(body: string, ts: number, secret = SECRET): string {
  const sig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

function context(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function guardWith(secret: string | undefined): StripeWebhookGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new StripeWebhookGuard(config);
}

describe('StripeWebhookGuard', () => {
  const now = Math.floor(Date.now() / 1000);

  it('admits a correctly signed raw body', () => {
    const guard = guardWith(SECRET);
    const ctx = context({
      headers: { 'stripe-signature': header(BODY, now) },
      rawBody: BODY,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const guard = guardWith(SECRET);
    const ctx = context({
      headers: { 'stripe-signature': header(BODY, now) },
      rawBody: BODY + 'x',
    });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('rejects a missing signature header', () => {
    const guard = guardWith(SECRET);
    const ctx = context({ headers: {}, rawBody: BODY });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('rejects when the webhook secret is not configured', () => {
    const guard = guardWith(undefined);
    const ctx = context({
      headers: { 'stripe-signature': header(BODY, now) },
      rawBody: BODY,
    });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('accepts a Buffer raw body', () => {
    const guard = guardWith(SECRET);
    const ctx = context({
      headers: { 'stripe-signature': header(BODY, now) },
      rawBody: Buffer.from(BODY, 'utf8'),
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('falls back to the parsed body when no rawBody is present', () => {
    const guard = guardWith(SECRET);
    const body = { a: 1 };
    const serialized = JSON.stringify(body);
    const ctx = context({
      headers: { 'stripe-signature': header(serialized, now) },
      body,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
