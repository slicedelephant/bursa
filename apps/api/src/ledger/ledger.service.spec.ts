import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';

/**
 * In-memory fake for the slice of PrismaService the LedgerService uses. It models
 * the append semantics (last-entry lookup + create) so the sequence and prevHash
 * chain can be asserted without a real DB.
 */
function createPrismaFake() {
  const entries: any[] = [];
  const tx = {
    ledgerEntry: {
      findFirst: jest.fn(async ({ where, orderBy, select }: any) => {
        const matching = entries
          .filter((e) => e.schoolId === where.schoolId)
          .sort((a, b) => b.sequence - a.sequence);
        const top = matching[0];
        if (!top) return null;
        if (select) {
          return { sequence: top.sequence, entryHash: top.entryHash };
        }
        return top;
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `e-${entries.length + 1}`, ...data };
        entries.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where, orderBy }: any) => {
        let rows = entries.slice();
        if (where?.schoolId) {
          rows = rows.filter((e) => e.schoolId === where.schoolId);
        }
        if (where?.createdAt) {
          const { gte, lte } = where.createdAt;
          rows = rows.filter((e) => {
            const t = new Date(e.createdAt ?? 0).getTime();
            return (!gte || t >= gte.getTime()) && (!lte || t <= lte.getTime());
          });
        }
        return rows.sort((a, b) =>
          orderBy?.sequence === 'desc'
            ? b.sequence - a.sequence
            : a.sequence - b.sequence,
        );
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    ledgerEntry: tx.ledgerEntry,
  } as unknown as PrismaService;
  return { prisma, entries };
}

const movement = (refId: string) => ({
  entryType: LedgerEntryType.PAYOUT,
  amountCents: 40000,
  schoolId: 'school-1',
  reason: `Payout ${refId}`,
  refType: 'Payout',
  refId,
});

describe('LedgerService', () => {
  it('exposes no update or delete method (append-only invariant)', () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    expect((service as any).update).toBeUndefined();
    expect((service as any).delete).toBeUndefined();
    expect((service as any).remove).toBeUndefined();
  });

  it('appends a genesis entry at sequence 1 with empty prevHash', async () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    const entry = await service.append(movement('p1'));
    expect(entry.sequence).toBe(1);
    expect(entry.prevHash).toBe('');
    expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('chains subsequent entries (sequence + prevHash)', async () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    const first = await service.append(movement('p1'));
    const second = await service.append(movement('p2'));
    expect(second.sequence).toBe(2);
    expect(second.prevHash).toBe(first.entryHash);
  });

  it('keeps sequences independent per school', async () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    await service.append(movement('p1'));
    const otherSchool = await service.append({
      entryType: LedgerEntryType.DONATION,
      amountCents: 1000,
      schoolId: 'school-2',
      reason: 'Donation',
    });
    expect(otherSchool.sequence).toBe(1);
    expect(otherSchool.prevHash).toBe('');
  });

  it('lists entries newest-first and builds a valid ledger view', async () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    await service.append(movement('p1'));
    await service.append(movement('p2'));

    const list = await service.listForSchool('school-1');
    expect(list[0].sequence).toBe(2);

    const view = await service.viewForSchool('school-1');
    expect(view.integrity.valid).toBe(true);
    expect(view.entries).toHaveLength(2);
  });

  it('lists all entries across schools for reporting (no window)', async () => {
    const { prisma } = createPrismaFake();
    const service = new LedgerService(prisma);
    await service.append(movement('p1'));
    await service.append({
      entryType: LedgerEntryType.DONATION,
      amountCents: 1000,
      schoolId: 'school-2',
      reason: 'Donation',
    });
    const all = await service.listAllForReporting();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((e) => e.schoolId))).toEqual(
      new Set(['school-1', 'school-2']),
    );
  });

  it('applies a date window when reporting', async () => {
    const { prisma, entries } = createPrismaFake();
    const service = new LedgerService(prisma);
    await service.append(movement('p1'));
    // Stamp the only entry into 2024 so a 2026 window excludes it.
    entries[0].createdAt = new Date('2024-01-01T00:00:00Z');
    const within = await service.listAllForReporting({
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-12-31T23:59:59Z'),
    });
    expect(within).toHaveLength(0);
  });
});
