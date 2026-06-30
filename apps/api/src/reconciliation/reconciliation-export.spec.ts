import { payoutsToCsv, payoutsToPdfLines } from './reconciliation-export';
import { PayoutRowView } from './reconciliation-view';

const row = (overrides: Partial<PayoutRowView> = {}): PayoutRowView => ({
  payoutId: 'p1',
  campaignTitle: 'Amara Okonkwo',
  amountCents: 40000,
  currency: 'EUR',
  payoutStatus: 'SENT',
  reconciliationStatus: 'MATCHED',
  bankTx: {
    externalId: 'btx-1',
    amountCents: 40000,
    currency: 'EUR',
    reference: 'REF-1',
    postedAt: '2026-06-30T11:00:00.000Z',
  },
  discrepancyCents: null,
  sentAt: '2026-06-30T10:00:00.000Z',
  ...overrides,
});

describe('reconciliation-export', () => {
  describe('payoutsToCsv', () => {
    it('renders a header and one row per payout', () => {
      const csv = payoutsToCsv([row()]);
      const lines = csv.trim().split('\n');
      expect(lines[0]).toContain('Payout,Campaign,Amount (EUR)');
      expect(lines).toHaveLength(2);
      expect(csv).toContain('400.00');
      expect(csv).toContain('MATCHED');
      expect(csv).toContain('REF-1');
      expect(csv).toContain('2026-06-30');
    });

    it('renders the discrepancy amount when present', () => {
      const csv = payoutsToCsv([
        row({ reconciliationStatus: 'DISCREPANCY', discrepancyCents: -500 }),
      ]);
      expect(csv).toContain('-5.00');
    });

    it('escapes commas/quotes in the campaign title', () => {
      const csv = payoutsToCsv([row({ campaignTitle: 'Kwame, "K", Mensah' })]);
      expect(csv).toContain('"Kwame, ""K"", Mensah"');
    });

    it('handles a null sentAt and a missing bank reference', () => {
      const csv = payoutsToCsv([
        row({
          sentAt: null,
          payoutStatus: 'PENDING',
          reconciliationStatus: 'PENDING',
          bankTx: null,
        }),
      ]);
      const line = csv.trim().split('\n')[1];
      // Empty Sent At + empty Bank Reference cells.
      expect(line.endsWith(',')).toBe(true);
    });
  });

  describe('payoutsToPdfLines', () => {
    it('returns a placeholder for an empty list', () => {
      expect(payoutsToPdfLines([])).toEqual(['No payouts yet.']);
    });

    it('formats a matched row with the bank reference', () => {
      const [line] = payoutsToPdfLines([row()]);
      expect(line).toContain('Amara Okonkwo');
      expect(line).toContain('[MATCHED]');
      expect(line).toContain('bank REF-1');
    });

    it('formats a discrepancy row', () => {
      const [line] = payoutsToPdfLines([
        row({ reconciliationStatus: 'DISCREPANCY', discrepancyCents: -500 }),
      ]);
      expect(line).toContain('[DISCREPANCY]');
      expect(line).toContain('discrepancy -5.00 EUR');
    });

    it('formats an unmatched row', () => {
      const [line] = payoutsToPdfLines([
        row({ reconciliationStatus: 'UNMATCHED', bankTx: null }),
      ]);
      expect(line).toContain('no bank match');
    });

    it('falls back to the bank externalId when the reference is null', () => {
      const [line] = payoutsToPdfLines([
        row({
          bankTx: {
            externalId: 'btx-99',
            amountCents: 40000,
            currency: 'EUR',
            reference: null,
            postedAt: '2026-06-30T11:00:00.000Z',
          },
        }),
      ]);
      expect(line).toContain('bank btx-99');
    });

    it('handles a null sentAt in the PDF line', () => {
      const [line] = payoutsToPdfLines([row({ sentAt: null })]);
      expect(line.startsWith('  ')).toBe(true);
    });
  });
});
