import { LedgerEntry, LedgerEntryType } from '@prisma/client';
import {
  buildLedgerEntry,
  genesisPosition,
  nextPosition,
} from './ledger-entry';
import { buildLedgerView, toLedgerEntryView } from './ledger-view';

const at = new Date('2026-06-30T12:00:00.000Z');

/** Build a persisted-shaped row from the pure builder so hashes are consistent. */
function buildRow(
  seq: number,
  prev: { sequence: number; entryHash: string } | null,
): LedgerEntry {
  const built = buildLedgerEntry(
    {
      entryType: LedgerEntryType.PAYOUT,
      amountCents: 40000,
      schoolId: 'school-1',
      reason: `Payout ${seq}`,
      refType: 'Payout',
      refId: `payout-${seq}`,
    },
    prev ? nextPosition(prev, at) : genesisPosition(at),
  );
  return {
    id: `entry-${seq}`,
    sequence: built.sequence,
    entryType: built.entryType,
    amountCents: built.amountCents,
    currency: built.currency,
    schoolId: built.schoolId,
    actorUserId: built.actorUserId,
    reason: built.reason,
    refType: built.refType,
    refId: built.refId,
    prevHash: built.prevHash,
    entryHash: built.entryHash,
    createdAt: built.createdAt,
  };
}

describe('ledger-view', () => {
  describe('toLedgerEntryView', () => {
    it('maps a row to the view shape with ISO createdAt', () => {
      const row = buildRow(1, null);
      const view = toLedgerEntryView(row);
      expect(view.sequence).toBe(1);
      expect(view.entryType).toBe('PAYOUT');
      expect(view.refId).toBe('payout-1');
      expect(view.createdAt).toBe(at.toISOString());
    });
  });

  describe('buildLedgerView', () => {
    it('reports a valid integrity for a correct chain', () => {
      const e1 = buildRow(1, null);
      const e2 = buildRow(2, e1);
      const view = buildLedgerView('school-1', [e1, e2]);
      expect(view.integrity.valid).toBe(true);
      expect(view.integrity.checkedCount).toBe(2);
      expect(view.entries).toHaveLength(2);
    });

    it('verifies integrity regardless of input order (newest-first)', () => {
      const e1 = buildRow(1, null);
      const e2 = buildRow(2, e1);
      // Pass newest-first, as the API lists them.
      const view = buildLedgerView('school-1', [e2, e1]);
      expect(view.integrity.valid).toBe(true);
      // Entries preserve the given (newest-first) order.
      expect(view.entries[0].sequence).toBe(2);
    });

    it('flags a tampered amount', () => {
      const e1 = buildRow(1, null);
      const e2 = { ...buildRow(2, e1), amountCents: 99999 };
      const view = buildLedgerView('school-1', [e1, e2]);
      expect(view.integrity.valid).toBe(false);
      expect(view.integrity.brokenAtSequence).toBe(2);
    });

    it('handles an empty ledger', () => {
      const view = buildLedgerView('school-1', []);
      expect(view.integrity.valid).toBe(true);
      expect(view.entries).toHaveLength(0);
    });

    it('maps null optional fields (actor/refType/refId) to null', () => {
      const e1 = buildRow(1, null);
      const withNulls: LedgerEntry = {
        ...e1,
        actorUserId: null,
        refType: null,
        refId: null,
      };
      const view = buildLedgerView('school-1', [withNulls]);
      expect(view.entries[0].refType).toBeNull();
      expect(view.entries[0].refId).toBeNull();
    });
  });
});
