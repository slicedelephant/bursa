import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { HrisWebhookGuard } from './hris-webhook.guard';

const SECRET = 'hriswhsec_test';
const BODY = '{"connectionId":"conn_1","status":"SYNCED"}';

function header(body: string, ts: number, secret = SECRET): string {
  const sig = createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');
  return `t=${ts},v1=${sig}`;
}

function context(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function guardWith(secret: string | undefined): HrisWebhookGuard {
  const config = { get: () => secret } as unknown as ConfigService;
  return new HrisWebhookGuard(config);
}

describe('HrisWebhookGuard (E21)', () => {
  const now = Math.floor(Date.now() / 1000);

  it('admits a correctly signed raw body', () => {
    const ctx = context({
      headers: { 'x-hris-signature': header(BODY, now) },
      rawBody: BODY,
    });
    expect(guardWith(SECRET).canActivate(ctx)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const ctx = context({
      headers: { 'x-hris-signature': header(BODY, now) },
      rawBody: BODY + 'x',
    });
    expect(() => guardWith(SECRET).canActivate(ctx)).toThrow(
      'signature verification failed',
    );
  });

  it('rejects a missing signature header', () => {
    const ctx = context({ headers: {}, rawBody: BODY });
    expect(() => guardWith(SECRET).canActivate(ctx)).toThrow();
  });

  it('rejects when the secret is not configured', () => {
    const ctx = context({
      headers: { 'x-hris-signature': header(BODY, now) },
      rawBody: BODY,
    });
    expect(() => guardWith(undefined).canActivate(ctx)).toThrow();
  });

  it('accepts a Buffer raw body', () => {
    const ctx = context({
      headers: { 'x-hris-signature': header(BODY, now) },
      rawBody: Buffer.from(BODY, 'utf8'),
    });
    expect(guardWith(SECRET).canActivate(ctx)).toBe(true);
  });

  it('falls back to the parsed body when no rawBody is present', () => {
    const body = { connectionId: 'conn_1', status: 'ERROR' };
    const serialized = JSON.stringify(body);
    const ctx = context({
      headers: { 'x-hris-signature': header(serialized, now) },
      body,
    });
    expect(guardWith(SECRET).canActivate(ctx)).toBe(true);
  });
});
