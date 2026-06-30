import {
  AmlDecision,
  ReviewQueueStatus,
  VerificationCaseStatus,
} from '@prisma/client';
import {
  applyReviewDecision,
  canTransition,
  isTerminal,
  nextAfterAml,
  nextAfterDocument,
  nextAfterLiveness,
  reviewQueueFor,
} from './verification-state';

describe('verification-state', () => {
  describe('canTransition', () => {
    it('allows STARTED → LIVENESS_PASSED', () => {
      expect(
        canTransition(
          VerificationCaseStatus.STARTED,
          VerificationCaseStatus.LIVENESS_PASSED,
        ),
      ).toBe(true);
    });
    it('allows any in-flight state → MANUAL_REVIEW', () => {
      expect(
        canTransition(
          VerificationCaseStatus.LIVENESS_PASSED,
          VerificationCaseStatus.MANUAL_REVIEW,
        ),
      ).toBe(true);
    });
    it('forbids skipping straight to VERIFIED from STARTED', () => {
      expect(
        canTransition(
          VerificationCaseStatus.STARTED,
          VerificationCaseStatus.VERIFIED,
        ),
      ).toBe(false);
    });
    it('forbids any transition out of a terminal state', () => {
      expect(
        canTransition(
          VerificationCaseStatus.VERIFIED,
          VerificationCaseStatus.MANUAL_REVIEW,
        ),
      ).toBe(false);
    });
  });

  describe('reviewQueueFor', () => {
    it('is PENDING for MANUAL_REVIEW', () => {
      expect(reviewQueueFor(VerificationCaseStatus.MANUAL_REVIEW)).toBe(
        ReviewQueueStatus.PENDING,
      );
    });
    it('is NOT_REQUIRED otherwise', () => {
      expect(reviewQueueFor(VerificationCaseStatus.VERIFIED)).toBe(
        ReviewQueueStatus.NOT_REQUIRED,
      );
    });
  });

  describe('step transitions', () => {
    it('liveness passed → LIVENESS_PASSED, failed → MANUAL_REVIEW', () => {
      expect(nextAfterLiveness(true)).toBe(
        VerificationCaseStatus.LIVENESS_PASSED,
      );
      expect(nextAfterLiveness(false)).toBe(
        VerificationCaseStatus.MANUAL_REVIEW,
      );
    });
    it('document matched → VERIFIED, mismatch → MANUAL_REVIEW', () => {
      expect(nextAfterDocument(true)).toBe(VerificationCaseStatus.VERIFIED);
      expect(nextAfterDocument(false)).toBe(
        VerificationCaseStatus.MANUAL_REVIEW,
      );
    });
    it('aml CLEAR → VERIFIED, HIT → MANUAL_REVIEW, BLOCKED → REJECTED', () => {
      expect(nextAfterAml(AmlDecision.CLEAR)).toBe(
        VerificationCaseStatus.VERIFIED,
      );
      expect(nextAfterAml(AmlDecision.HIT)).toBe(
        VerificationCaseStatus.MANUAL_REVIEW,
      );
      expect(nextAfterAml(AmlDecision.BLOCKED)).toBe(
        VerificationCaseStatus.REJECTED,
      );
    });
  });

  describe('applyReviewDecision', () => {
    it('APPROVE → VERIFIED, REJECT → REJECTED', () => {
      expect(applyReviewDecision('APPROVE')).toBe(
        VerificationCaseStatus.VERIFIED,
      );
      expect(applyReviewDecision('REJECT')).toBe(
        VerificationCaseStatus.REJECTED,
      );
    });
  });

  describe('isTerminal', () => {
    it('is true for VERIFIED and REJECTED', () => {
      expect(isTerminal(VerificationCaseStatus.VERIFIED)).toBe(true);
      expect(isTerminal(VerificationCaseStatus.REJECTED)).toBe(true);
    });
    it('is false for in-flight states', () => {
      expect(isTerminal(VerificationCaseStatus.STARTED)).toBe(false);
    });
  });
});
