import {
  amlDecisionLabel,
  caseStatusLabel,
  reviewReason,
  riskLevelClass,
  riskLevelLabel,
  scoreBarWidth,
} from './kyc-review-format';

describe('kyc-review-format', () => {
  describe('riskLevelLabel', () => {
    it('title-cases', () => {
      expect(riskLevelLabel('HIGH')).toBe('High');
      expect(riskLevelLabel('LOW')).toBe('Low');
    });
  });

  describe('riskLevelClass', () => {
    it('maps bands to colour chips', () => {
      expect(riskLevelClass('CRITICAL')).toContain('brand-orange');
      expect(riskLevelClass('HIGH')).toContain('amber-100');
      expect(riskLevelClass('MEDIUM')).toContain('amber-50');
      expect(riskLevelClass('LOW')).toContain('mist');
    });
  });

  describe('caseStatusLabel', () => {
    it('labels common statuses', () => {
      expect(caseStatusLabel('MANUAL_REVIEW')).toBe('In review');
      expect(caseStatusLabel('VERIFIED')).toBe('Verified');
      expect(caseStatusLabel('REJECTED')).toBe('Rejected');
    });
    it('title-cases an underscored status', () => {
      expect(caseStatusLabel('LIVENESS_PASSED')).toBe('Liveness Passed');
    });
  });

  describe('amlDecisionLabel', () => {
    it('labels decisions', () => {
      expect(amlDecisionLabel('CLEAR')).toBe('Clear');
      expect(amlDecisionLabel('HIT')).toBe('Watchlist hit');
      expect(amlDecisionLabel('BLOCKED')).toBe('Blocked (sanctioned)');
    });
  });

  describe('reviewReason', () => {
    it('prioritises a failed liveness', () => {
      expect(
        reviewReason({
          liveness: { passed: false },
          document: null,
          aml: null,
        }),
      ).toBe('Liveness check failed');
    });
    it('flags a document mismatch', () => {
      expect(
        reviewReason({
          liveness: { passed: true },
          document: { matched: false },
          aml: null,
        }),
      ).toBe('Document name mismatch');
    });
    it('flags an AML hit and block', () => {
      expect(reviewReason({ liveness: null, document: null, aml: { decision: 'HIT' } })).toBe(
        'AML watchlist hit',
      );
      expect(
        reviewReason({
          liveness: null,
          document: null,
          aml: { decision: 'BLOCKED' },
        }),
      ).toBe('AML blocked (sanctioned country)');
    });
    it('defaults to a generic reason', () => {
      expect(reviewReason({ liveness: { passed: true }, document: null, aml: null })).toBe(
        'Manual review required',
      );
    });
  });

  describe('scoreBarWidth', () => {
    it('clamps to 0-100', () => {
      expect(scoreBarWidth(-5)).toBe('0%');
      expect(scoreBarWidth(150)).toBe('100%');
      expect(scoreBarWidth(42)).toBe('42%');
    });
  });
});
