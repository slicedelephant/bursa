import { MatchBalance, MatchOffer } from '../../core/models';
import {
  balanceLabel,
  claimCtaKind,
  eur,
  isOfferWorthShowing,
  statusTone,
  usedPercent,
} from './match-format';

const offer: MatchOffer = {
  eligible: true,
  employerName: 'SAP',
  matchCents: 10_000,
  integrationLevel: 'PORTAL',
  labels: { headline: 'h', cta: 'c', balance: 'b' },
};

const balance: MatchBalance = {
  employerName: 'SAP',
  year: 2026,
  annualCapCents: 500_000,
  usedCents: 200_000,
  remainingAnnualCents: 300_000,
  claims: [],
};

describe('match-format', () => {
  describe('eur', () => {
    it('formats whole euros', () => {
      expect(eur(80_000)).toBe('€800');
    });
    it('handles null', () => {
      expect(eur(null)).toBe('€0');
    });
  });

  describe('balanceLabel', () => {
    it('shows remaining for an eligible balance', () => {
      expect(balanceLabel(balance)).toBe('€3000 match still available this year');
    });
    it('falls back when no employer', () => {
      expect(balanceLabel(null)).toContain('No employer match');
      expect(balanceLabel({ ...balance, remainingAnnualCents: undefined })).toContain(
        'No employer match',
      );
    });
  });

  describe('usedPercent', () => {
    it('computes the used percentage', () => {
      expect(usedPercent(balance)).toBe(40);
    });
    it('clamps and handles no cap', () => {
      expect(usedPercent(null)).toBe(0);
      expect(usedPercent({ ...balance, annualCapCents: 0 })).toBe(0);
      expect(usedPercent({ ...balance, usedCents: 999_999 })).toBe(100);
    });
  });

  describe('claimCtaKind', () => {
    it('is pdf for MANUAL, link otherwise', () => {
      expect(claimCtaKind(offer)).toBe('link');
      expect(claimCtaKind({ ...offer, integrationLevel: 'MANUAL' })).toBe('pdf');
    });
  });

  describe('isOfferWorthShowing', () => {
    it('is true for an eligible positive offer', () => {
      expect(isOfferWorthShowing(offer)).toBe(true);
    });
    it('is false for null/ineligible/zero', () => {
      expect(isOfferWorthShowing(null)).toBe(false);
      expect(isOfferWorthShowing({ ...offer, eligible: false })).toBe(false);
      expect(isOfferWorthShowing({ ...offer, matchCents: 0 })).toBe(false);
    });
  });

  describe('statusTone', () => {
    it('maps statuses to tones', () => {
      expect(statusTone('CLAIMED')).toBe('green');
      expect(statusTone('REJECTED')).toBe('orange');
      expect(statusTone('SUBMITTED')).toBe('blue');
      expect(statusTone('DETECTED')).toBe('slate');
    });
  });
});
