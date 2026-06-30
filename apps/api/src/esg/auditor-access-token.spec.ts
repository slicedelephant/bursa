import {
  createAuditorToken,
  hashAuditorToken,
  MAX_TTL_MS,
  MIN_TTL_MS,
  resolveTtlMs,
  validateAuditorToken,
} from './auditor-access-token';

describe('auditor-access-token', () => {
  const now = new Date('2026-06-30T12:00:00Z');
  const fixedBytes = () => Buffer.alloc(32, 7);

  describe('createAuditorToken', () => {
    it('returns a raw token, its hash, and an expiry', () => {
      const created = createAuditorToken({ now, bytes: fixedBytes });
      expect(created.token).toBe(Buffer.alloc(32, 7).toString('hex'));
      expect(created.tokenHash).toBe(hashAuditorToken(created.token));
      // default TTL 48h
      expect(created.expiresAt.getTime()).toBe(
        now.getTime() + 48 * 3600 * 1000,
      );
    });

    it('honours a custom ttlMs', () => {
      const created = createAuditorToken({
        now,
        ttlMs: 3600_000,
        bytes: fixedBytes,
      });
      expect(created.expiresAt.getTime()).toBe(now.getTime() + 3600_000);
    });
  });

  describe('resolveTtlMs', () => {
    it('defaults to 48h when undefined or non-numeric', () => {
      expect(resolveTtlMs(undefined)).toBe(48 * 3600 * 1000);
      expect(resolveTtlMs(NaN)).toBe(48 * 3600 * 1000);
    });

    it('clamps into [MIN, MAX]', () => {
      expect(resolveTtlMs(0)).toBe(MIN_TTL_MS);
      expect(resolveTtlMs(99999)).toBe(MAX_TTL_MS);
      expect(resolveTtlMs(48)).toBe(48 * 3600 * 1000);
    });
  });

  describe('validateAuditorToken', () => {
    const created = createAuditorToken({ now, bytes: fixedBytes });
    const record = {
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt,
      revokedAt: null as Date | null,
    };

    it('accepts a matching, unrevoked, unexpired token', () => {
      expect(validateAuditorToken(record, created.token, now)).toEqual({
        valid: true,
      });
    });

    it('rejects a missing record or empty token as malformed', () => {
      expect(validateAuditorToken(null, created.token, now).reason).toBe(
        'malformed',
      );
      expect(validateAuditorToken(record, '', now).reason).toBe('malformed');
    });

    it('rejects a wrong token as mismatch (no existence leak)', () => {
      const other = createAuditorToken({
        now,
        bytes: () => Buffer.alloc(32, 9),
      });
      expect(validateAuditorToken(record, other.token, now).reason).toBe(
        'mismatch',
      );
    });

    it('rejects a revoked grant', () => {
      const revoked = {
        ...record,
        revokedAt: new Date('2026-06-30T13:00:00Z'),
      };
      expect(validateAuditorToken(revoked, created.token, now).reason).toBe(
        'revoked',
      );
    });

    it('rejects an expired grant', () => {
      const later = new Date(created.expiresAt.getTime() + 1000);
      expect(validateAuditorToken(record, created.token, later).reason).toBe(
        'expired',
      );
    });
  });
});
