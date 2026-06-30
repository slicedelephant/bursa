import { LedgerEntryType } from '@prisma/client';
import { hashEntry } from './ledger-hash';
import {
  buildLedgerEntry,
  genesisPosition,
  MovementInput,
  nextPosition,
} from './ledger-entry';

const movement = (overrides: Partial<MovementInput> = {}): MovementInput => ({
  entryType: LedgerEntryType.PAYOUT,
  amountCents: 40000,
  schoolId: 'school-1',
  reason: 'Payout to school',
  refType: 'Payout',
  refId: 'payout-1',
  ...overrides,
});

const at = new Date('2026-06-30T12:00:00.000Z');

describe('ledger-entry', () => {
  describe('genesisPosition', () => {
    it('starts at sequence 1 with an empty prevHash', () => {
      const pos = genesisPosition(at);
      expect(pos.sequence).toBe(1);
      expect(pos.prevHash).toBe('');
      expect(pos.createdAt).toBe(at);
    });
  });

  describe('nextPosition', () => {
    it('increments the sequence and chains the prevHash', () => {
      const pos = nextPosition({ sequence: 5, entryHash: 'deadbeef' }, at);
      expect(pos.sequence).toBe(6);
      expect(pos.prevHash).toBe('deadbeef');
    });
  });

  describe('buildLedgerEntry', () => {
    it('applies defaults (currency EUR, null optional refs)', () => {
      const entry = buildLedgerEntry(
        {
          entryType: LedgerEntryType.DONATION,
          amountCents: 5000,
          schoolId: 'school-1',
          reason: 'Donation',
        },
        genesisPosition(at),
      );
      expect(entry.currency).toBe('EUR');
      expect(entry.actorUserId).toBeNull();
      expect(entry.refType).toBeNull();
      expect(entry.refId).toBeNull();
      expect(entry.sequence).toBe(1);
      expect(entry.prevHash).toBe('');
    });

    it('computes an entryHash consistent with hashEntry', () => {
      const pos = genesisPosition(at);
      const entry = buildLedgerEntry(movement(), pos);
      const expected = hashEntry({
        sequence: 1,
        entryType: LedgerEntryType.PAYOUT,
        amountCents: 40000,
        currency: 'EUR',
        schoolId: 'school-1',
        actorUserId: null,
        reason: 'Payout to school',
        refType: 'Payout',
        refId: 'payout-1',
        createdAt: at.toISOString(),
        prevHash: '',
      });
      expect(entry.entryHash).toBe(expected);
    });

    it('chains two entries so the second prevHash is the first entryHash', () => {
      const first = buildLedgerEntry(movement(), genesisPosition(at));
      const second = buildLedgerEntry(
        movement({ refId: 'payout-2' }),
        nextPosition(first, at),
      );
      expect(second.sequence).toBe(2);
      expect(second.prevHash).toBe(first.entryHash);
      expect(second.entryHash).not.toBe(first.entryHash);
    });

    it('keeps a provided actorUserId and currency', () => {
      const entry = buildLedgerEntry(
        movement({ actorUserId: 'admin-1', currency: 'USD' }),
        genesisPosition(at),
      );
      expect(entry.actorUserId).toBe('admin-1');
      expect(entry.currency).toBe('USD');
    });
  });
});
