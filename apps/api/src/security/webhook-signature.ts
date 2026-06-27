import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a Stripe-style webhook signature without the Stripe SDK (which is an
 * optional, possibly-uninstalled dependency). Reproduces Stripe's scheme:
 *   signedPayload = `${timestamp}.${rawBody}`
 *   expected      = HMAC_SHA256(secret, signedPayload)  (hex)
 * compared timing-safe against the `v1` value, with a timestamp tolerance to
 * reject replays. Pure (clock injected) and dependency-free for deterministic tests.
 */

export interface VerifyInput {
  /** The exact raw request body bytes/string that was signed. */
  rawBody: string;
  /** The `stripe-signature` header value: `t=<unix>,v1=<hex>[,v1=<hex>...]`. */
  header: string | undefined;
  /** The shared webhook signing secret. */
  secret: string | undefined;
  /** Current time in epoch seconds (injected for testability). */
  nowSec: number;
  /** Allowed clock skew / replay window in seconds. */
  toleranceSec?: number;
}

const DEFAULT_TOLERANCE_SEC = 300;

interface ParsedHeader {
  timestamp: number | null;
  signatures: string[];
}

/** Parses `t=...,v1=...,v1=...` into a timestamp and the list of v1 sigs. */
export function parseSignatureHeader(header: string): ParsedHeader {
  const parts = header.split(',');
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't' && value) {
      const ts = Number(value);
      timestamp = Number.isFinite(ts) ? ts : null;
    } else if (key === 'v1' && value) {
      signatures.push(value);
    }
  }
  return { timestamp, signatures };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(input: VerifyInput): boolean {
  const { rawBody, header, secret, nowSec } = input;
  const tolerance = input.toleranceSec ?? DEFAULT_TOLERANCE_SEC;
  if (!header || !secret) return false;

  const { timestamp, signatures } = parseSignatureHeader(header);
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSec - timestamp) > tolerance) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  return signatures.some((sig) => safeEqualHex(sig, expected));
}
