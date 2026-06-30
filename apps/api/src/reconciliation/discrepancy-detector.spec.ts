import { detectDiscrepancies, detectRow } from './discrepancy-detector';
import {
  BankTxForMatch,
  MatchedRow,
  PayoutForMatch,
} from './reconciliation-matcher';

const payout = (id: string, amount = 40000): PayoutForMatch => ({
  payoutId: id,
  schoolId: 'school-1',
  amountCents: amount,
  currency: 'EUR',
  reference: `REF-${id}`,
  status: 'SENT',
  sentAt: new Date('2026-06-30T10:00:00.000Z'),
});

const tx = (amount: number): BankTxForMatch => ({
  externalId: 'btx',
  amountCents: amount,
  currency: 'EUR',
  reference: 'REF-p1',
  postedAt: new Date('2026-06-30T11:00:00.000Z'),
});

describe('discrepancy-detector', () => {
  describe('detectRow', () => {
    it('keeps MATCHED when amounts are equal', () => {
      const row: MatchedRow = {
        payout: payout('p1', 40000),
        status: 'MATCHED',
        bankTx: tx(40000),
      };
      const result = detectRow(row);
      expect(result.status).toBe('MATCHED');
      expect(result.discrepancyCents).toBeNull();
    });

    it('elevates to DISCREPANCY when bank amount differs', () => {
      const row: MatchedRow = {
        payout: payout('p1', 40000),
        status: 'MATCHED',
        bankTx: tx(39500),
      };
      const result = detectRow(row);
      expect(result.status).toBe('DISCREPANCY');
      expect(result.discrepancyCents).toBe(-500);
    });

    it('passes PENDING/UNMATCHED through untouched', () => {
      const pending: MatchedRow = {
        payout: payout('p1'),
        status: 'PENDING',
        bankTx: null,
      };
      expect(detectRow(pending).status).toBe('PENDING');
      const unmatched: MatchedRow = {
        payout: payout('p2'),
        status: 'UNMATCHED',
        bankTx: null,
      };
      expect(detectRow(unmatched).status).toBe('UNMATCHED');
    });
  });

  describe('detectDiscrepancies', () => {
    it('summarises the four statuses', () => {
      const rows: MatchedRow[] = [
        { payout: payout('p1'), status: 'MATCHED', bankTx: tx(40000) },
        { payout: payout('p2'), status: 'MATCHED', bankTx: tx(38000) },
        { payout: payout('p3'), status: 'PENDING', bankTx: null },
        { payout: payout('p4'), status: 'UNMATCHED', bankTx: null },
      ];
      const result = detectDiscrepancies(rows, []);
      expect(result.summary.matchedCount).toBe(1);
      expect(result.summary.discrepancyCount).toBe(1);
      expect(result.summary.pendingCount).toBe(1);
      expect(result.summary.unmatchedCount).toBe(1);
    });

    it('maps orphan bank transactions', () => {
      const orphan: BankTxForMatch = {
        externalId: 'orphan-1',
        amountCents: 5000,
        currency: 'EUR',
        reference: 'NO-PAYOUT',
        postedAt: new Date(),
      };
      const result = detectDiscrepancies([], [orphan]);
      expect(result.orphanBankTx).toHaveLength(1);
      expect(result.orphanBankTx[0].externalId).toBe('orphan-1');
    });
  });
});
