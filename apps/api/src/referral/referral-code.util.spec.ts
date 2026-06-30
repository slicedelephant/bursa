import {
  createReferralCode,
  hashReferralCode,
  validateReferralCode,
} from './referral-code.util';

describe('referral-code.util', () => {
  describe('createReferralCode', () => {
    it('returns a raw code plus its SHA-256 hash', () => {
      const created = createReferralCode({
        bytes: () => Buffer.from('0123456789abcdef0123', 'hex'),
      });
      expect(created.code).toBe('0123456789abcdef0123');
      expect(created.codeHash).toBe(hashReferralCode('0123456789abcdef0123'));
      expect(created.codeHash).not.toBe(created.code);
    });

    it('produces a hex-only code via the default random source', () => {
      const created = createReferralCode();
      expect(created.code).toMatch(/^[0-9a-f]+$/);
      expect(created.code.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('hashReferralCode', () => {
    it('is deterministic for the same input', () => {
      expect(hashReferralCode('abc')).toBe(hashReferralCode('abc'));
    });

    it('differs for different inputs', () => {
      expect(hashReferralCode('abc')).not.toBe(hashReferralCode('abd'));
    });
  });

  describe('validateReferralCode', () => {
    const created = createReferralCode({
      bytes: () => Buffer.from('aabbccddeeff00112233', 'hex'),
    });
    const record = { codeHash: created.codeHash };

    it('accepts the matching raw code', () => {
      expect(validateReferralCode(record, created.code)).toEqual({
        valid: true,
      });
    });

    it('rejects a missing record as malformed', () => {
      expect(validateReferralCode(null, created.code)).toEqual({
        valid: false,
        reason: 'malformed',
      });
    });

    it('rejects an empty raw code as malformed', () => {
      expect(validateReferralCode(record, '')).toEqual({
        valid: false,
        reason: 'malformed',
      });
    });

    it('rejects a non-string raw code as malformed', () => {
      expect(
        validateReferralCode(record, undefined as unknown as string),
      ).toEqual({ valid: false, reason: 'malformed' });
    });

    it('rejects a wrong code as a mismatch', () => {
      expect(validateReferralCode(record, 'deadbeef').valid).toBe(false);
      expect(validateReferralCode(record, 'deadbeef').reason).toBe('mismatch');
    });

    it('rejects a revoked code even when the hash matches', () => {
      expect(
        validateReferralCode(
          { codeHash: created.codeHash, status: 'REVOKED' },
          created.code,
        ),
      ).toEqual({ valid: false, reason: 'revoked' });
    });

    it('accepts an explicitly ACTIVE code', () => {
      expect(
        validateReferralCode(
          { codeHash: created.codeHash, status: 'ACTIVE' },
          created.code,
        ),
      ).toEqual({ valid: true });
    });
  });
});
