import { buildStaleAlerts, isStale } from './stale-payout-alert';
import { PayoutForMatch, STALE_AFTER_HOURS } from './reconciliation-matcher';

const now = new Date('2026-06-30T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const payout = (overrides: Partial<PayoutForMatch> = {}): PayoutForMatch => ({
  payoutId: 'p1',
  schoolId: 'school-1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'REF',
  status: 'SENT',
  sentAt: hoursAgo(STALE_AFTER_HOURS + 5),
  ...overrides,
});

describe('stale-payout-alert', () => {
  describe('isStale', () => {
    it('is true for an UNMATCHED payout older than the threshold', () => {
      expect(isStale({ payout: payout(), status: 'UNMATCHED' }, now)).toBe(
        true,
      );
    });

    it('is false for a non-UNMATCHED status', () => {
      expect(isStale({ payout: payout(), status: 'PENDING' }, now)).toBe(false);
      expect(isStale({ payout: payout(), status: 'MATCHED' }, now)).toBe(false);
    });

    it('is false when sentAt is missing', () => {
      expect(
        isStale({ payout: payout({ sentAt: null }), status: 'UNMATCHED' }, now),
      ).toBe(false);
    });

    it('is false when not yet past the threshold', () => {
      expect(
        isStale(
          { payout: payout({ sentAt: hoursAgo(1) }), status: 'UNMATCHED' },
          now,
        ),
      ).toBe(false);
    });
  });

  describe('buildStaleAlerts', () => {
    it('returns alerts only for stale rows with hoursStale', () => {
      const alerts = buildStaleAlerts(
        [
          { payout: payout({ payoutId: 'stale' }), status: 'UNMATCHED' },
          { payout: payout({ payoutId: 'ok' }), status: 'MATCHED' },
        ],
        now,
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0].payoutId).toBe('stale');
      expect(alerts[0].hoursStale).toBeGreaterThanOrEqual(STALE_AFTER_HOURS);
      expect(alerts[0].amountCents).toBe(40000);
    });

    it('returns no alerts when nothing is stale', () => {
      expect(
        buildStaleAlerts([{ payout: payout(), status: 'MATCHED' }], now),
      ).toHaveLength(0);
    });
  });
});
