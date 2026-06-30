import { LedgerEntryType } from '@prisma/client';
import {
  canonicalize,
  ChainEntry,
  hashEntry,
  LedgerHashInput,
  verifyChain,
} from './ledger-hash';

const baseInput = (
  overrides: Partial<LedgerHashInput> = {},
): LedgerHashInput => ({
  sequence: 1,
  entryType: LedgerEntryType.DONATION,
  amountCents: 10000,
  currency: 'EUR',
  schoolId: 'school-1',
  actorUserId: 'user-1',
  reason: 'Donation captured',
  refType: 'Donation',
  refId: 'don-1',
  createdAt: '2026-06-30T10:00:00.000Z',
  prevHash: '',
  ...overrides,
});

describe('ledger-hash', () => {
  describe('canonicalize', () => {
    it('produces a stably key-sorted serialisation', () => {
      const canon = canonicalize(baseInput());
      expect(canon).toContain('amountCents=10000');
      expect(canon).toContain('schoolId=school-1');
      // Keys are sorted alphabetically: actorUserId before amountCents.
      expect(canon.indexOf('actorUserId=')).toBeLessThan(
        canon.indexOf('amountCents='),
      );
    });

    it('is independent of input object key order', () => {
      const a = canonicalize(baseInput());
      const b = canonicalize({
        prevHash: '',
        createdAt: '2026-06-30T10:00:00.000Z',
        reason: 'Donation captured',
        sequence: 1,
        schoolId: 'school-1',
        refType: 'Donation',
        refId: 'don-1',
        entryType: LedgerEntryType.DONATION,
        currency: 'EUR',
        amountCents: 10000,
        actorUserId: 'user-1',
      });
      expect(a).toEqual(b);
    });

    it('encodes nulls as empty strings', () => {
      const canon = canonicalize(
        baseInput({ actorUserId: null, refType: null, refId: null }),
      );
      expect(canon).toContain('actorUserId=');
      expect(canon).toContain('refId=|');
    });
  });

  describe('hashEntry', () => {
    it('is deterministic for the same input', () => {
      expect(hashEntry(baseInput())).toEqual(hashEntry(baseInput()));
    });

    it('returns a 64-char hex sha256', () => {
      expect(hashEntry(baseInput())).toMatch(/^[0-9a-f]{64}$/);
    });

    it('changes when any field changes', () => {
      const original = hashEntry(baseInput());
      expect(hashEntry(baseInput({ amountCents: 10001 }))).not.toEqual(
        original,
      );
      expect(hashEntry(baseInput({ reason: 'tampered' }))).not.toEqual(
        original,
      );
      expect(hashEntry(baseInput({ prevHash: 'abc' }))).not.toEqual(original);
    });
  });

  describe('verifyChain', () => {
    const buildChain = (count: number): ChainEntry[] => {
      const entries: ChainEntry[] = [];
      let prevHash = '';
      for (let i = 1; i <= count; i++) {
        const input = baseInput({ sequence: i, prevHash, refId: `ref-${i}` });
        const entryHash = hashEntry(input);
        entries.push({ ...input, entryHash });
        prevHash = entryHash;
      }
      return entries;
    };

    it('accepts an empty chain as valid', () => {
      expect(verifyChain([])).toEqual({
        valid: true,
        checkedCount: 0,
        brokenAtSequence: null,
      });
    });

    it('accepts a correctly linked chain', () => {
      const result = verifyChain(buildChain(3));
      expect(result.valid).toBe(true);
      expect(result.checkedCount).toBe(3);
      expect(result.brokenAtSequence).toBeNull();
    });

    it('rejects a chain where an amount was tampered (hash mismatch)', () => {
      const chain = buildChain(3);
      const tampered = [
        chain[0],
        { ...chain[1], amountCents: 99999 },
        chain[2],
      ];
      const result = verifyChain(tampered);
      expect(result.valid).toBe(false);
      expect(result.brokenAtSequence).toBe(2);
    });

    it('rejects a broken prevHash link', () => {
      const chain = buildChain(2);
      const broken = [chain[0], { ...chain[1], prevHash: 'wrong' }];
      // Recompute the second entry's hash so only the link is wrong.
      const result = verifyChain(broken);
      expect(result.valid).toBe(false);
      expect(result.brokenAtSequence).toBe(2);
    });

    it('rejects a non-monotonic sequence', () => {
      const chain = buildChain(3);
      const reordered = [chain[0], chain[2], chain[1]];
      const result = verifyChain(reordered);
      expect(result.valid).toBe(false);
    });

    it('rejects a non-empty genesis prevHash', () => {
      const input = baseInput({ sequence: 1, prevHash: 'not-empty' });
      const entry: ChainEntry = { ...input, entryHash: hashEntry(input) };
      const result = verifyChain([entry]);
      expect(result.valid).toBe(false);
      expect(result.brokenAtSequence).toBe(1);
    });
  });
});
