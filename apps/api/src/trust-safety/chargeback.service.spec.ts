import { ChargebackService } from './chargeback.service';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const chargeback = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'cb1', ...data }),
      ),
    update: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'cb1', ...data }),
      ),
    count: jest.fn().mockResolvedValue(1),
  };
  const campaign = { update: jest.fn().mockResolvedValue({}) };
  return { chargeback, campaign, ...overrides };
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const analytics = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ChargebackService(prisma as never, analytics as never);
  return { service, analytics };
}

function event(id: string, amount: number, campaignId?: string) {
  return {
    id: 'evt_1',
    type: 'charge.dispute.created',
    data: {
      object: {
        id,
        amount,
        currency: 'eur',
        reason: 'fraudulent',
        metadata: campaignId ? { campaignId } : {},
      },
    },
  };
}

const now = new Date('2026-06-29T12:00:00.000Z');

describe('ChargebackService', () => {
  it('rejects an event without a dispute id', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await expect(
      service.ingest({ data: { object: {} } }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('creates a chargeback and records analytics', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue(null);
    prisma.chargeback.count.mockResolvedValue(1);
    const { service, analytics } = makeService(prisma);
    const result = await service.ingest(event('dp_1', 4_500, 'c1'), now);
    expect(prisma.chargeback.create).toHaveBeenCalled();
    expect(result.campaignFrozen).toBe(false);
    expect(analytics.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'trust.chargeback' }),
    );
  });

  it('applies defaults for a sparse dispute with no campaign', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    const result = await service.ingest(
      { data: { object: { id: 'dp_min' } } },
      now,
    );
    const created = prisma.chargeback.create.mock.calls[0][0].data;
    expect(created.amountCents).toBe(0);
    expect(created.currency).toBe('EUR');
    expect(created.reason).toBe('unknown');
    expect(created.campaignId).toBeNull();
    expect(result.campaignFrozen).toBe(false);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it('is idempotent on duplicate delivery', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue({ id: 'cbX' });
    const { service } = makeService(prisma);
    const result = await service.ingest(event('dp_1', 4_500, 'c1'), now);
    expect(result.idempotent).toBe(true);
    expect(result.chargebackId).toBe('cbX');
    expect(prisma.chargeback.create).not.toHaveBeenCalled();
  });

  it('freezes the campaign at the third chargeback', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue(null);
    prisma.chargeback.count.mockResolvedValue(3);
    const { service } = makeService(prisma);
    const result = await service.ingest(event('dp_3', 4_500, 'c1'), now);
    expect(result.campaignFrozen).toBe(true);
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ frozen: true }),
      }),
    );
  });

  it('submits evidence on an open dispute', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue({
      id: 'cb1',
      status: 'OPEN',
      amountCents: 4_500,
    });
    const { service } = makeService(prisma);
    await service.submitEvidence('cb1', 'receipts attached');
    expect(prisma.chargeback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'EVIDENCE_SUBMITTED' }),
      }),
    );
  });

  it('rejects evidence on a non-open dispute', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue({
      id: 'cb1',
      status: 'WON',
      amountCents: 4_500,
    });
    const { service } = makeService(prisma);
    await expect(service.submitEvidence('cb1', 'x')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('offers a refund for a low-value open dispute', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue({
      id: 'cb1',
      status: 'OPEN',
      amountCents: 2_000,
    });
    const { service } = makeService(prisma);
    const updated = await service.offerRefund('cb1');
    expect(updated.refundOffered).toBe(true);
    expect(updated.status).toBe('REFUND_OFFERED');
  });

  it('refuses a refund for a high-value dispute', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue({
      id: 'cb1',
      status: 'OPEN',
      amountCents: 100_000,
    });
    const { service } = makeService(prisma);
    await expect(service.offerRefund('cb1')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('throws NOT_FOUND for a missing chargeback', async () => {
    const prisma = buildPrisma();
    prisma.chargeback.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(service.offerRefund('missing')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('lists chargebacks filtered by status', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.list('OPEN');
    expect(prisma.chargeback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'OPEN' } }),
    );
  });

  it('lists all chargebacks when no status is given', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.list();
    expect(prisma.chargeback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});
