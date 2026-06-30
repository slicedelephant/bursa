import { TrustDashboardService } from './trust-dashboard.service';

function buildPrisma() {
  return {
    fraudSignal: { findMany: jest.fn().mockResolvedValue([]) },
    chargeback: { findMany: jest.fn().mockResolvedValue([]) },
    donation: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    moderationCase: { findMany: jest.fn().mockResolvedValue([]) },
    campaignFlag: { findMany: jest.fn().mockResolvedValue([]) },
    campaign: { count: jest.fn().mockResolvedValue(0) },
    user: { count: jest.fn().mockResolvedValue(0) },
  };
}

function makeService(
  prisma: ReturnType<typeof buildPrisma>,
  auditEntries: unknown[] = [],
) {
  const audit = { list: jest.fn().mockResolvedValue(auditEntries) };
  const service = new TrustDashboardService(prisma as never, audit as never);
  return { service, audit };
}

const now = new Date('2026-06-29T12:00:00.000Z');

describe('TrustDashboardService', () => {
  it('aggregates the dashboard from the trust tables', async () => {
    const prisma = buildPrisma();
    prisma.fraudSignal.findMany.mockResolvedValue([
      { kind: 'CARD_TESTING', riskLevel: 'CRITICAL', createdAt: now },
    ]);
    prisma.chargeback.findMany.mockResolvedValue([
      { status: 'OPEN', refundOffered: false },
    ]);
    prisma.donation.count.mockResolvedValue(50);
    prisma.campaign.count.mockResolvedValue(1);
    const { service } = makeService(prisma);
    const dash = await service.dashboard(now);
    expect(dash.fraud.totalSignals).toBe(1);
    expect(dash.fraud.highRiskSignals).toBe(1);
    expect(dash.chargebacks.total).toBe(1);
    expect(dash.frozen.campaigns).toBe(1);
  });

  it('builds a heat-map joining donation country onto signals/chargebacks', async () => {
    const prisma = buildPrisma();
    prisma.donation.findMany.mockResolvedValue([
      { donorCountry: 'DE' },
      { donorCountry: 'RU' },
    ]);
    prisma.fraudSignal.findMany.mockResolvedValue([
      { donation: { donorCountry: 'RU' } },
    ]);
    prisma.chargeback.findMany.mockResolvedValue([
      { donation: { donorCountry: 'RU' } },
    ]);
    const { service } = makeService(prisma);
    const { rows } = await service.heatMap();
    expect(rows[0].country).toBe('RU');
    expect(rows[0].signalCount).toBe(1);
    expect(rows[0].chargebackCount).toBe(1);
  });

  it('exports moderation actions as CSV', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma, [
      {
        createdAt: now,
        action: 'moderation.reject',
        actorUserId: 'admin1',
        targetType: 'Campaign',
        targetId: 'c1',
        metadata: { result: 'REJECTED' },
      },
      {
        createdAt: now,
        action: 'account.export',
        actorUserId: 'u1',
        targetType: 'User',
        targetId: 'u1',
        metadata: {},
      },
    ]);
    const csv = await service.auditCsv();
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'createdAt,action,actorUserId,targetType,targetId,result',
    );
    expect(lines).toHaveLength(2); // header + only the moderation row
    expect(lines[1]).toContain('moderation.reject');
    expect(lines[1]).toContain('REJECTED');
  });

  it('handles null fields, string dates and CSV-escaping', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma, [
      {
        createdAt: '2026-06-29T00:00:00.000Z', // already a string, not a Date
        action: 'moderation.escalate',
        actorUserId: null,
        targetType: null,
        targetId: 'c1, c2', // contains a comma → must be quoted
        metadata: null,
      },
    ]);
    const csv = await service.auditCsv();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"c1, c2"');
    expect(
      lines[1].startsWith('2026-06-29T00:00:00.000Z,moderation.escalate,,,'),
    ).toBe(true);
  });
});
