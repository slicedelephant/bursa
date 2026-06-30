import {
  canTransition,
  isTerminal,
  MatchClaimStatus,
  statusLabel,
} from './claim-status';

describe('claim-status', () => {
  describe('canTransition', () => {
    it('allows DETECTED → CLAIMED', () => {
      expect(canTransition('DETECTED', 'CLAIMED')).toBe(true);
    });
    it('allows CLAIMED → SUBMITTED → APPROVED', () => {
      expect(canTransition('CLAIMED', 'SUBMITTED')).toBe(true);
      expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    });
    it('forbids going backwards', () => {
      expect(canTransition('CLAIMED', 'DETECTED')).toBe(false);
    });
    it('forbids leaving a terminal state', () => {
      expect(canTransition('APPROVED', 'SUBMITTED')).toBe(false);
      expect(canTransition('REJECTED', 'CLAIMED')).toBe(false);
    });
    it('returns false for an unknown status', () => {
      expect(canTransition('NOPE' as MatchClaimStatus, 'CLAIMED')).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('marks APPROVED/REJECTED/EXPIRED terminal', () => {
      expect(isTerminal('APPROVED')).toBe(true);
      expect(isTerminal('REJECTED')).toBe(true);
      expect(isTerminal('EXPIRED')).toBe(true);
    });
    it('marks CLAIMED non-terminal', () => {
      expect(isTerminal('CLAIMED')).toBe(false);
    });
  });

  describe('statusLabel', () => {
    it('maps each status to a label', () => {
      expect(statusLabel('CLAIMED')).toBe('Claimed');
      expect(statusLabel('APPROVED')).toBe('Approved');
    });
    it('falls back to the raw value', () => {
      expect(statusLabel('WAT' as MatchClaimStatus)).toBe('WAT');
    });
  });
});
