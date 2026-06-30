import {
  canRunDocument,
  canRunLiveness,
  isCaseTerminal,
  kycProgressPercent,
  kycStatusClass,
  kycStatusLabel,
} from './kyc-status';

describe('kyc-status', () => {
  describe('kycStatusLabel', () => {
    it('labels every status', () => {
      expect(kycStatusLabel('STARTED')).toBe('Started');
      expect(kycStatusLabel('LIVENESS_PASSED')).toBe('Liveness passed');
      expect(kycStatusLabel('DOCUMENT_VERIFIED')).toBe('Document verified');
      expect(kycStatusLabel('AML_CLEARED')).toBe('AML cleared');
      expect(kycStatusLabel('VERIFIED')).toBe('Verified');
      expect(kycStatusLabel('MANUAL_REVIEW')).toBe('In manual review');
      expect(kycStatusLabel('REJECTED')).toBe('Rejected');
    });
    it('falls back to the raw value for an unknown status', () => {
      expect(kycStatusLabel('WAT' as never)).toBe('WAT');
    });
  });

  describe('kycStatusClass', () => {
    it('uses green for verified, orange for rejected, amber for review', () => {
      expect(kycStatusClass('VERIFIED')).toContain('brand-green');
      expect(kycStatusClass('REJECTED')).toContain('brand-orange');
      expect(kycStatusClass('MANUAL_REVIEW')).toContain('amber');
      expect(kycStatusClass('STARTED')).toContain('mist');
    });
  });

  describe('step gating', () => {
    it('allows liveness only from STARTED', () => {
      expect(canRunLiveness('STARTED')).toBe(true);
      expect(canRunLiveness('LIVENESS_PASSED')).toBe(false);
    });
    it('allows document only from LIVENESS_PASSED', () => {
      expect(canRunDocument('LIVENESS_PASSED')).toBe(true);
      expect(canRunDocument('STARTED')).toBe(false);
    });
  });

  describe('isCaseTerminal', () => {
    it('is true for VERIFIED and REJECTED', () => {
      expect(isCaseTerminal('VERIFIED')).toBe(true);
      expect(isCaseTerminal('REJECTED')).toBe(true);
      expect(isCaseTerminal('STARTED')).toBe(false);
    });
  });

  describe('kycProgressPercent', () => {
    it('grows along every step', () => {
      expect(kycProgressPercent('STARTED')).toBe(25);
      expect(kycProgressPercent('LIVENESS_PASSED')).toBe(60);
      expect(kycProgressPercent('DOCUMENT_VERIFIED')).toBe(90);
      expect(kycProgressPercent('AML_CLEARED')).toBe(90);
      expect(kycProgressPercent('VERIFIED')).toBe(100);
      expect(kycProgressPercent('MANUAL_REVIEW')).toBe(75);
      expect(kycProgressPercent('REJECTED')).toBe(100);
    });
    it('is 0 for an unknown status', () => {
      expect(kycProgressPercent('WAT' as never)).toBe(0);
    });
  });

  describe('kycStatusClass default', () => {
    it('handles other in-flight statuses with the neutral chip', () => {
      expect(kycStatusClass('DOCUMENT_VERIFIED')).toContain('mist');
      expect(kycStatusClass('AML_CLEARED')).toContain('mist');
    });
  });
});
