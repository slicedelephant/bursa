import { PrismaService } from '../prisma/prisma.service';
import { MockBankFeedProvider } from './mock-bank-feed.provider';
import { ReconciliationService } from './reconciliation.service';

const now = new Date('2026-06-30T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

function createPrismaFake(payouts: any[], school: any, donations: any[] = []) {
  const bankTxCreates: any[] = [];
  const reconciliationCreates: any[] = [];
  const prisma = {
    payout: {
      findMany: jest.fn(async ({ select }: any) =>
        // The transparency path selects only amountCents.
        select && !select.campaign
          ? payouts.map((p) => ({ amountCents: p.amountCents }))
          : payouts,
      ),
    },
    bankTransaction: {
      upsert: jest.fn(async ({ create }: any) => {
        bankTxCreates.push(create);
        return create;
      }),
    },
    reconciliation: {
      create: jest.fn(async ({ data }: any) => {
        reconciliationCreates.push(data);
        return { id: 'rec-1', ...data };
      }),
    },
    donation: {
      findMany: jest.fn(async () => donations),
    },
    school: {
      findUnique: jest.fn(async () => school),
    },
  } as unknown as PrismaService;
  return { prisma, bankTxCreates, reconciliationCreates };
}

const matchedPayout = {
  id: 'p1',
  amountCents: 40000,
  reference: 'REF-1',
  status: 'SENT',
  sentAt: hoursAgo(2),
  campaign: { title: 'Amara Okonkwo', currency: 'EUR' },
};

const stalePayout = {
  id: 'p2',
  amountCents: 25000,
  reference: 'REF-2-STALE',
  status: 'SENT',
  sentAt: hoursAgo(72),
  campaign: { title: 'Kwame Mensah', currency: 'EUR' },
};

const euSchool = {
  id: 'school-1',
  name: 'ESMT Berlin',
  country: 'DE',
  iban: 'DE89370400440532013000',
  taxId: 'DE811234567',
};

describe('ReconciliationService', () => {
  it('reconciles payouts against the mock bank feed', async () => {
    const { prisma, bankTxCreates, reconciliationCreates } = createPrismaFake(
      [matchedPayout, stalePayout],
      euSchool,
    );
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );

    const view = await service.reconcile('school-1', now);

    expect(view.summary.matchedCount).toBe(1);
    expect(view.summary.unmatchedCount).toBe(1);
    expect(view.alerts).toHaveLength(1);
    // The matched payout got a bank tx; the stale one did not; plus one orphan.
    expect(view.unmatchedBankTx.length).toBeGreaterThanOrEqual(1);
    // Bank transactions were persisted idempotently and a run was recorded.
    expect(bankTxCreates.length).toBeGreaterThan(0);
    expect(reconciliationCreates).toHaveLength(1);
    expect(reconciliationCreates[0].matchedCount).toBe(1);
  });

  it('builds a payout CSV export', async () => {
    const { prisma } = createPrismaFake([matchedPayout], euSchool);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const csv = await service.exportCsv('school-1');
    expect(csv).toContain('Payout,Campaign,Amount (EUR)');
    expect(csv).toContain('Amara Okonkwo');
    expect(csv).toContain('MATCHED');
  });

  it('builds a PDF export (valid PDF header)', async () => {
    const { prisma } = createPrismaFake([matchedPayout], euSchool);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const pdf = await service.exportPdf('school-1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('%%EOF');
  });

  it('builds a SEPA tax-report CSV for an EU school', async () => {
    const { prisma } = createPrismaFake([matchedPayout], euSchool);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const csv = await service.taxReportCsv('school-1');
    expect(csv).toContain('Regime,EU_SEPA');
    expect(csv).toContain('**** 3000');
  });

  it('builds a balanced double-entry accounting CSV', async () => {
    const { prisma } = createPrismaFake([matchedPayout], euSchool);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const csv = await service.accountingCsv('school-1');
    expect(csv).toContain(
      'Date,Journal,Account,Account Name,Debit,Credit,Memo',
    );
    expect(csv).toContain('5000');
    expect(csv).toContain('1000');
  });

  it('builds a PII-free transparency aggregate', async () => {
    const donations = [
      { amountCents: 10000, donorCountry: 'DE', campaignId: 'c1' },
      { amountCents: 20000, donorCountry: 'US', campaignId: 'c1' },
    ];
    const { prisma } = createPrismaFake([matchedPayout], euSchool, donations);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const result = await service.transparency('school-1');
    expect(result.schoolName).toBe('ESMT Berlin');
    expect(result.totalRaisedCents).toBe(30000);
    expect(result.totalPaidOutCents).toBe(40000);
    expect(result.donationCount).toBe(2);
    expect(result.donorGeography.length).toBeGreaterThan(0);
  });

  it('throws NOT_FOUND for transparency of a missing school', async () => {
    const { prisma } = createPrismaFake([], null, []);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    await expect(service.transparency('missing')).rejects.toThrow();
  });

  it('returns payout rows without recording a run', async () => {
    const { prisma, reconciliationCreates } = createPrismaFake(
      [matchedPayout],
      euSchool,
    );
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const rows = await service.payoutRows('school-1', now);
    expect(rows).toHaveLength(1);
    expect(reconciliationCreates).toHaveLength(0);
  });

  it('falls back to defaults when campaign / school fields are missing', async () => {
    const sparsePayout = {
      id: 'p9',
      amountCents: 12345,
      reference: 'REF-9',
      status: 'SENT',
      sentAt: hoursAgo(2),
      campaign: null,
    };
    const sparseSchool = {
      id: 'school-1',
      name: null,
      country: null,
      iban: null,
      taxId: null,
    };
    const { prisma } = createPrismaFake([sparsePayout], sparseSchool);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const csv = await service.exportCsv('school-1');
    expect(csv).toContain('Unknown');
    const tax = await service.taxReportCsv('school-1');
    // No country → US 1099 regime, recipient defaults to "School".
    expect(tax).toContain('Regime,US_1099');
    expect(tax).toContain('School');
  });

  it('falls back to a default school name in transparency when name is null', async () => {
    const { prisma } = createPrismaFake([], { id: 'school-1', name: '' }, []);
    const service = new ReconciliationService(
      prisma,
      new MockBankFeedProvider(),
    );
    const result = await service.transparency('school-1');
    expect(result.schoolId).toBe('school-1');
  });

  it('defaults the persisted provider name to "mock" when unnamed', async () => {
    const { prisma, bankTxCreates } = createPrismaFake(
      [matchedPayout],
      euSchool,
    );
    // A bank-feed provider with no `name` exercises the provider-name fallback.
    const unnamedFeed = {
      fetchTransactions: async () => [
        {
          externalId: 'btx-x',
          amountCents: 40000,
          currency: 'EUR',
          reference: 'REF-1',
          postedAt: hoursAgo(1),
        },
      ],
    };
    const service = new ReconciliationService(prisma, unnamedFeed as any);
    await service.reconcile('school-1', now);
    expect(bankTxCreates.some((c) => c.provider === 'mock')).toBe(true);
  });
});
