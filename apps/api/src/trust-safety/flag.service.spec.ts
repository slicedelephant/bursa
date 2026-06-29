import { FlagReason } from '@prisma/client';
import { FlagService } from './flag.service';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const campaign = { findUnique: jest.fn() };
  const campaignFlag = {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'fl1', status: 'OPEN', ...data }),
      ),
    update: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: 'fl1', ...data })),
  };
  return { campaign, campaignFlag, ...overrides };
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const analytics = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new FlagService(prisma as never, analytics as never);
  return { service, analytics };
}

describe('FlagService', () => {
  it('throws NOT_FOUND for a missing campaign', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.create('missing', { reason: FlagReason.SCAM }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('creates a flag and records analytics', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c1' });
    const { service, analytics } = makeService(prisma);
    const result = await service.create(
      'c1',
      { reason: FlagReason.SCAM, note: 'looks fake', visitorId: 'anon-1' },
      'u1',
    );
    expect(result.status).toBe('OPEN');
    expect(prisma.campaignFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          campaignId: 'c1',
          reporterUserId: 'u1',
          visitorId: 'anon-1',
          reason: FlagReason.SCAM,
        }),
      }),
    );
    expect(analytics.record).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'trust.flag' }),
    );
  });

  it('supports anonymous reports', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c1' });
    const { service } = makeService(prisma);
    await service.create('c1', { reason: FlagReason.DUPLICATE });
    const data = prisma.campaignFlag.create.mock.calls[0][0].data;
    expect(data.reporterUserId).toBeNull();
  });

  it('lists flags filtered by status', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.list('OPEN');
    expect(prisma.campaignFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'OPEN' } }),
    );
  });

  it('decides a flag (review/dismiss)', async () => {
    const prisma = buildPrisma();
    prisma.campaignFlag.findUnique.mockResolvedValue({ id: 'fl1' });
    const { service } = makeService(prisma);
    const reviewed = await service.decide('fl1', { action: 'REVIEW' });
    expect(reviewed.status).toBe('REVIEWED');
    const dismissed = await service.decide('fl1', { action: 'DISMISS' });
    expect(dismissed.status).toBe('DISMISSED');
  });

  it('throws NOT_FOUND when deciding a missing flag', async () => {
    const prisma = buildPrisma();
    prisma.campaignFlag.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.decide('x', { action: 'REVIEW' }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
