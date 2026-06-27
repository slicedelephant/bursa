import { createHmac } from 'crypto';
import {
  parseSignatureHeader,
  verifyWebhookSignature,
} from './webhook-signature';

const SECRET = 'whsec_test_secret';
const BODY = '{"id":"evt_1","type":"ping"}';

function sign(body: string, ts: number, secret = SECRET): string {
  const sig = createHmac('sha256', secret)
    .update(`${ts}.${body}`)
    .digest('hex');
  return `t=${ts},v1=${sig}`;
}

describe('parseSignatureHeader', () => {
  it('extracts timestamp and v1 signatures', () => {
    const parsed = parseSignatureHeader('t=123,v1=abc,v1=def');
    expect(parsed.timestamp).toBe(123);
    expect(parsed.signatures).toEqual(['abc', 'def']);
  });

  it('returns null timestamp for malformed header', () => {
    expect(parseSignatureHeader('garbage').timestamp).toBeNull();
  });
});

describe('verifyWebhookSignature', () => {
  const now = 1_700_000_000;

  it('accepts a correctly signed payload', () => {
    const header = sign(BODY, now);
    expect(
      verifyWebhookSignature({ rawBody: BODY, header, secret: SECRET, nowSec: now }),
    ).toBe(true);
  });

  it('rejects a tampered body', () => {
    const header = sign(BODY, now);
    expect(
      verifyWebhookSignature({
        rawBody: BODY + 'x',
        header,
        secret: SECRET,
        nowSec: now,
      }),
    ).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const header = sign(BODY, now, 'other');
    expect(
      verifyWebhookSignature({ rawBody: BODY, header, secret: SECRET, nowSec: now }),
    ).toBe(false);
  });

  it('rejects an expired timestamp (outside tolerance)', () => {
    const header = sign(BODY, now - 10_000);
    expect(
      verifyWebhookSignature({
        rawBody: BODY,
        header,
        secret: SECRET,
        nowSec: now,
        toleranceSec: 300,
      }),
    ).toBe(false);
  });

  it('rejects a missing header or secret', () => {
    expect(
      verifyWebhookSignature({ rawBody: BODY, header: undefined, secret: SECRET, nowSec: now }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ rawBody: BODY, header: sign(BODY, now), secret: undefined, nowSec: now }),
    ).toBe(false);
  });

  it('rejects a header without a v1 signature', () => {
    expect(
      verifyWebhookSignature({ rawBody: BODY, header: `t=${now}`, secret: SECRET, nowSec: now }),
    ).toBe(false);
  });

  it('accepts when one of several v1 signatures matches', () => {
    const good = createHmac('sha256', SECRET).update(`${now}.${BODY}`).digest('hex');
    const header = `t=${now},v1=deadbeef,v1=${good}`;
    expect(
      verifyWebhookSignature({ rawBody: BODY, header, secret: SECRET, nowSec: now }),
    ).toBe(true);
  });
});
