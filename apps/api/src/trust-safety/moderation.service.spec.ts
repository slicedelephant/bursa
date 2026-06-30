import { ModerationService } from './moderation.service';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const moderationCase = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    upsert: jest
      .fn()
      .mockImplementation(({ create, update }) =>
        Promise.resolve({ id: 'm1', ...(create ?? update) }),
      ),
    update: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'm1', ...data })),
  };
  const campaign = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  };
  const campaignFlag = { count: jest.fn().mockResolvedValue(0) };
  const prisma = {
    moderationCase,
    campaign,
    campaignFlag,
    $transaction: jest.fn().mockImplementation(async (cb) =>
      cb({
        moderationCase: {
          update: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: 'm1', ...data }),
            ),
        },
        campaign: { update: jest.fn().mockResolvedValue({}) },
      }),
    ),
    ...overrides,
  };
  return prisma;
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ModerationService(prisma as never, audit as never);
  return { service, audit };
}

describe('ModerationService', () => {
  it('lists the queue mapped with campaign title', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findMany.mockResolvedValue([
      {
        id: 'm1',
        campaignId: 'c1',
        status: 'OPEN',
        riskScore: 60,
        riskLevel: 'HIGH',
        reasons: ['suspicious_keyword:bitcoin'],
        autoFlagged: true,
        decisionNote: null,
        reviewedAt: null,
        createdAt: new Date(),
        campaign: { title: 'MBA tuition', frozen: false },
      },
    ]);
    const { service } = makeService(prisma);
    const queue = await service.listQueue();
    expect(queue[0].campaignTitle).toBe('MBA tuition');
    expect(queue[0].riskLevel).toBe('HIGH');
  });

  it('filters by status and tolerates a missing campaign relation', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findMany.mockResolvedValue([
      {
        id: 'm2',
        campaignId: 'c2',
        status: 'REJECTED',
        riskScore: 90,
        riskLevel: 'CRITICAL',
        reasons: [],
        autoFlagged: true,
        decisionNote: 'scam',
        reviewedAt: new Date(),
        createdAt: new Date(),
        campaign: null,
      },
    ]);
    const { service } = makeService(prisma);
    const queue = await service.listQueue('REJECTED');
    expect(prisma.moderationCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'REJECTED' } }),
    );
    expect(queue[0].campaignTitle).toBeNull();
    expect(queue[0].campaignFrozen).toBe(false);
  });

  it('throws NOT_FOUND when scanning a missing campaign', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(service.scan('missing')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('auto-flags a suspicious campaign on scan', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c1',
      schoolId: 's1',
      title: 'Guaranteed return crypto investment',
      story: 'double your money via western union',
      school: { country: 'DE' },
    });
    const { service } = makeService(prisma);
    await service.scan('c1');
    const upsertArg = prisma.moderationCase.upsert.mock.calls[0][0];
    expect(upsertArg.where).toEqual({ campaignId: 'c1' });
    expect(upsertArg.create.autoFlagged).toBe(true);
    expect(upsertArg.create.riskScore).toBeGreaterThanOrEqual(40);
  });

  it('throws NOT_FOUND when deciding a missing case', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.decide('x', 'admin1', { action: 'APPROVE', note: 'ok' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects deciding a non-open case with 409', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findUnique.mockResolvedValue({
      id: 'm1',
      campaignId: 'c1',
      status: 'APPROVED',
      riskScore: 10,
    });
    const { service } = makeService(prisma);
    await expect(
      service.decide('m1', 'admin1', { action: 'APPROVE', note: 'ok' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('approves an open case and writes an audit entry', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findUnique.mockResolvedValue({
      id: 'm1',
      campaignId: 'c1',
      status: 'OPEN',
      riskScore: 50,
    });
    const { service, audit } = makeService(prisma);
    await service.decide('m1', 'admin1', {
      action: 'APPROVE',
      note: 'looks fine',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'moderation.approve',
        actorUserId: 'admin1',
        targetType: 'Campaign',
        targetId: 'c1',
      }),
    );
  });

  it('freezes the campaign on REJECT', async () => {
    const prisma = buildPrisma();
    prisma.moderationCase.findUnique.mockResolvedValue({
      id: 'm1',
      campaignId: 'c1',
      status: 'OPEN',
      riskScore: 80,
    });
    const campaignUpdate = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (cb: never) =>
      (cb as unknown as (tx: unknown) => unknown)({
        moderationCase: {
          update: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: 'm1', ...data }),
            ),
        },
        campaign: { update: campaignUpdate },
      }),
    );
    const { service } = makeService(prisma);
    await service.decide('m1', 'admin1', { action: 'REJECT', note: 'scam' });
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ frozen: true }),
      }),
    );
  });
});
