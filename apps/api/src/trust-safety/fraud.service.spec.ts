import { FraudService } from './fraud.service';
import { HIGH_VALUE_CENTS } from './donor-risk';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const donation = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const fraudSignal = {
    create: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'f1', ...data })),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const chargeback = { count: jest.fn().mockResolvedValue(0) };
  const user = { update: jest.fn().mockResolvedValue({}) };
  return { donation, fraudSignal, chargeback, user, ...overrides };
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const analytics = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new FraudService(prisma as never, analytics as never);
  return { service, analytics };
}

const now = new Date('2026-06-29T12:00:00.000Z');

describe('FraudService', () => {
  it('lists signals with filters', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.listSignals({ donorUserId: 'u1', kind: 'CARD_TESTING' });
    expect(prisma.fraudSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { donorUserId: 'u1', kind: 'CARD_TESTING' },
      }),
    );
  });

  it('lists signals with no filters using the default take', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.listSignals({});
    expect(prisma.fraudSignal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, take: 50 }),
    );
  });

  it('classifies a high-velocity transaction as VELOCITY (not card-testing)', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd5',
      donorUserId: 'u5',
      amountCents: 1_000,
      donorCountry: 'DE',
      campaignId: 'c1',
      status: 'SUCCEEDED',
      createdAt: now,
    });
    // 6 donations spread across the hour: >5 in 1h (velocity) but <5 in any 10m window.
    prisma.donation.findMany.mockResolvedValue([
      { status: 'SUCCEEDED', createdAt: now },
      { status: 'SUCCEEDED', createdAt: new Date(now.getTime() - 12 * 60_000) },
      { status: 'SUCCEEDED', createdAt: new Date(now.getTime() - 24 * 60_000) },
      { status: 'SUCCEEDED', createdAt: new Date(now.getTime() - 36 * 60_000) },
      { status: 'SUCCEEDED', createdAt: new Date(now.getTime() - 48 * 60_000) },
      { status: 'SUCCEEDED', createdAt: new Date(now.getTime() - 58 * 60_000) },
    ]);
    const { service } = makeService(prisma);
    await service.scoreTransaction('d5', {}, now);
    const created = prisma.fraudSignal.create.mock.calls[0][0].data;
    expect(created.kind).toBe('VELOCITY');
  });

  it('throws NOT_FOUND for a missing donation', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(service.scoreTransaction('x')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('persists a signal, records analytics and updates donor risk', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorUserId: 'u1',
      amountCents: 1_000,
      donorCountry: 'DE',
      campaignId: 'c1',
      status: 'SUCCEEDED',
      createdAt: now,
    });
    prisma.donation.findMany.mockResolvedValue([
      { status: 'SUCCEEDED', createdAt: now },
    ]);
    const { service, analytics } = makeService(prisma);
    const result = await service.scoreTransaction('d1', {}, now);
    expect(prisma.fraudSignal.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
    expect(analytics.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'trust.fraud_signal' }),
    );
    expect(result.donorFrozen).toBe(false);
  });

  it('flags a high-value transaction with HIGH_VALUE kind', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd2',
      donorUserId: 'u2',
      amountCents: HIGH_VALUE_CENTS,
      donorCountry: 'DE',
      campaignId: 'c1',
      status: 'SUCCEEDED',
      createdAt: now,
    });
    prisma.donation.findMany.mockResolvedValue([
      { status: 'SUCCEEDED', createdAt: now },
    ]);
    const { service } = makeService(prisma);
    await service.scoreTransaction('d2', {}, now);
    const created = prisma.fraudSignal.create.mock.calls[0][0].data;
    expect(created.kind).toBe('HIGH_VALUE');
  });

  it('auto-freezes a donor on failed + chargeback pattern', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd3',
      donorUserId: 'u3',
      amountCents: 1_000,
      donorCountry: 'DE',
      campaignId: 'c1',
      status: 'FAILED',
      createdAt: now,
    });
    prisma.donation.findMany.mockResolvedValue([
      { status: 'FAILED', createdAt: now },
      { status: 'FAILED', createdAt: new Date(now.getTime() - 60_000) },
    ]);
    prisma.chargeback.count.mockResolvedValue(1);
    const { service } = makeService(prisma);
    const result = await service.scoreTransaction('d3', {}, now);
    expect(result.donorFrozen).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ frozen: true }),
      }),
    );
  });

  it('handles anonymous donations (no donor) without a user update', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd4',
      donorUserId: null,
      amountCents: 1_000,
      donorCountry: 'DE',
      campaignId: 'c1',
      status: 'SUCCEEDED',
      createdAt: now,
    });
    const { service } = makeService(prisma);
    const result = await service.scoreTransaction('d4', {}, now);
    expect(result.donorFrozen).toBe(false);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
