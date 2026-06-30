import { AmlDecision } from '@prisma/client';
import {
  AML_THRESHOLD_CENTS,
  decideAml,
  requiresAmlScreening,
} from './aml-decision';

describe('aml-decision', () => {
  describe('requiresAmlScreening', () => {
    it('is false at or below the threshold', () => {
      expect(requiresAmlScreening(AML_THRESHOLD_CENTS)).toBe(false);
      expect(requiresAmlScreening(100_000)).toBe(false);
    });
    it('is true strictly above the threshold', () => {
      expect(requiresAmlScreening(AML_THRESHOLD_CENTS + 1)).toBe(true);
    });
    it('is false for non-finite amounts', () => {
      expect(requiresAmlScreening(NaN)).toBe(false);
    });
  });

  describe('decideAml', () => {
    it('clears below threshold without screening', () => {
      const result = decideAml({ amountCents: 100_000, country: 'RU' });
      expect(result.decision).toBe(AmlDecision.CLEAR);
      expect(result.screened).toBe(false);
    });

    it('blocks a sanctioned country above threshold', () => {
      const result = decideAml({ amountCents: 600_000, country: 'RU' });
      expect(result.decision).toBe(AmlDecision.BLOCKED);
      expect(result.screened).toBe(true);
      expect(result.reasons.join(' ')).toMatch(/sanctioned/i);
    });

    it('flags an elevated-risk country as a HIT', () => {
      const result = decideAml({ amountCents: 600_000, country: 'NG' });
      expect(result.decision).toBe(AmlDecision.HIT);
      expect(result.reasons.join(' ')).toMatch(/elevated-risk/i);
    });

    it('flags a provider watchlist hit as a HIT', () => {
      const result = decideAml({
        amountCents: 600_000,
        country: 'DE',
        providerHit: true,
      });
      expect(result.decision).toBe(AmlDecision.HIT);
      expect(result.reasons.join(' ')).toMatch(/watchlist/i);
    });

    it('clears a clean high-value contribution', () => {
      const result = decideAml({ amountCents: 600_000, country: 'DE' });
      expect(result.decision).toBe(AmlDecision.CLEAR);
      expect(result.screened).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });
});
