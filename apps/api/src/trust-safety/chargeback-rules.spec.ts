import {
  AUTO_REFUND_MAX_CENTS,
  canOfferRefund,
  canSubmitEvidence,
  nextChargebackStatus,
  shouldOfferAutoRefund,
} from './chargeback-rules';

describe('chargeback-rules', () => {
  describe('shouldOfferAutoRefund', () => {
    it('offers for low-value disputes', () => {
      expect(shouldOfferAutoRefund(2_000)).toBe(true);
      expect(shouldOfferAutoRefund(AUTO_REFUND_MAX_CENTS)).toBe(true);
    });

    it('does not offer for high-value or non-positive disputes', () => {
      expect(shouldOfferAutoRefund(AUTO_REFUND_MAX_CENTS + 1)).toBe(false);
      expect(shouldOfferAutoRefund(0)).toBe(false);
      expect(shouldOfferAutoRefund(-100)).toBe(false);
    });
  });

  describe('canSubmitEvidence / canOfferRefund', () => {
    it('allows evidence only when OPEN', () => {
      expect(canSubmitEvidence('OPEN')).toBe(true);
      expect(canSubmitEvidence('EVIDENCE_SUBMITTED')).toBe(false);
    });

    it('allows a refund only for an OPEN low-value dispute', () => {
      expect(canOfferRefund('OPEN', 1_000)).toBe(true);
      expect(canOfferRefund('OPEN', 100_000)).toBe(false);
      expect(canOfferRefund('REFUND_OFFERED', 1_000)).toBe(false);
    });
  });

  describe('nextChargebackStatus', () => {
    it('submits evidence from OPEN', () => {
      expect(nextChargebackStatus('OPEN', 'SUBMIT_EVIDENCE')).toBe(
        'EVIDENCE_SUBMITTED',
      );
    });

    it('offers a refund from OPEN', () => {
      expect(nextChargebackStatus('OPEN', 'OFFER_REFUND')).toBe(
        'REFUND_OFFERED',
      );
    });

    it('wins/loses from OPEN or EVIDENCE_SUBMITTED', () => {
      expect(nextChargebackStatus('OPEN', 'WIN')).toBe('WON');
      expect(nextChargebackStatus('EVIDENCE_SUBMITTED', 'LOSE')).toBe('LOST');
    });

    it('throws on invalid transitions', () => {
      expect(() =>
        nextChargebackStatus('EVIDENCE_SUBMITTED', 'SUBMIT_EVIDENCE'),
      ).toThrow('INVALID_TRANSITION');
      expect(() => nextChargebackStatus('WON', 'OFFER_REFUND')).toThrow(
        'INVALID_TRANSITION',
      );
      expect(() => nextChargebackStatus('REFUND_OFFERED', 'WIN')).toThrow(
        'INVALID_TRANSITION',
      );
    });
  });
});
