import { createHmac } from 'crypto';

/**
 * Minimal RFC 6238 TOTP (time-based one-time password) building block for admin
 * step-up. Pure and dependency-free (no otplib); the clock is injected so it is
 * deterministic in tests. Secrets are plain UTF-8 strings here (prototype) — a
 * production build would use a base32-encoded shared secret. Used by the
 * env-gated AdminMfaGuard, not a full per-user enrolment flow.
 */

const DIGITS = 6;
const STEP_SECONDS = 30;

/** Generates the TOTP code for a given counter value. */
function hotp(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  // Write the 64-bit counter big-endian (high 32 bits are ~0 for our range).
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);

  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Generates the current TOTP code for `nowSec`. */
export function generateTotp(secret: string, nowSec: number): string {
  return hotp(secret, Math.floor(nowSec / STEP_SECONDS));
}

/**
 * Verifies a token against the secret, allowing a ±`window` step drift to
 * tolerate clock skew. Constant-ish: compares numeric strings of equal length.
 */
export function verifyTotp(
  secret: string,
  token: string,
  nowSec: number,
  window = 1,
): boolean {
  if (!secret || !token || !/^\d{6}$/.test(token)) return false;
  const counter = Math.floor(nowSec / STEP_SECONDS);
  for (let drift = -window; drift <= window; drift++) {
    if (hotp(secret, counter + drift) === token) return true;
  }
  return false;
}
