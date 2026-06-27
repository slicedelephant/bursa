import {
  generateRequestId,
  isValidRequestId,
  resolveRequestId,
} from './request-id';

describe('request-id', () => {
  describe('isValidRequestId', () => {
    it('accepts bounded alphanumeric ids', () => {
      expect(isValidRequestId('req_abc12345')).toBe(true);
      expect(isValidRequestId('A-_'.repeat(3) + '123')).toBe(true);
    });

    it('rejects non-strings, too short, too long and unsafe chars', () => {
      expect(isValidRequestId(undefined)).toBe(false);
      expect(isValidRequestId(123 as unknown)).toBe(false);
      expect(isValidRequestId('short')).toBe(false);
      expect(isValidRequestId('x'.repeat(65))).toBe(false);
      expect(isValidRequestId('has space 12')).toBe(false);
      expect(isValidRequestId('inject@<>;12')).toBe(false);
    });
  });

  describe('generateRequestId', () => {
    it('produces a valid, prefixed, bounded id', () => {
      const id = generateRequestId(() => 0.5, () => 1_700_000_000_000);
      expect(id.startsWith('req_')).toBe(true);
      expect(id.length).toBeLessThanOrEqual(40);
      expect(isValidRequestId(id)).toBe(true);
    });

    it('is deterministic for fixed rand/now', () => {
      const a = generateRequestId(() => 0.1, () => 1);
      const b = generateRequestId(() => 0.1, () => 1);
      expect(a).toBe(b);
    });

    it('works with default rand/now (real clock)', () => {
      const id = generateRequestId();
      expect(isValidRequestId(id)).toBe(true);
    });
  });

  describe('resolveRequestId', () => {
    it('reuses a valid incoming header', () => {
      expect(resolveRequestId('req_incoming1')).toBe('req_incoming1');
    });

    it('takes the first element of an array header', () => {
      expect(resolveRequestId(['req_first0001', 'req_second002'])).toBe(
        'req_first0001',
      );
    });

    it('generates when header is missing or invalid', () => {
      expect(resolveRequestId(undefined, () => 'req_generated01')).toBe(
        'req_generated01',
      );
      expect(resolveRequestId('bad', () => 'req_generated01')).toBe(
        'req_generated01',
      );
    });

    it('uses the default generator when none is passed', () => {
      const id = resolveRequestId(undefined);
      expect(isValidRequestId(id)).toBe(true);
    });
  });
});
