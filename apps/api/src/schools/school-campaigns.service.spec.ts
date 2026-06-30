import { SchoolCampaignsService } from './school-campaigns.service';

const activeSchool = {
  id: 's1',
  onboardingStatus: 'ACTIVE',
  payoutVerified: true,
};

function buildPrisma() {
  const txApi = {
    admissionVerification: { upsert: jest.fn().mockResolvedValue({}) },
    campaignUpdate: { create: jest.fn().mockResolvedValue({}) },
    campaign: {
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'c1',
            title: 'MBA tuition',
            goalCents: 100_000,
            ...data,
          }),
        ),
    },
  };
  return {
    school: { findUnique: jest.fn().mockResolvedValue(activeSchool) },
    campaign: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ id: 'c1', schoolId: 's1' }),
    },
    $transaction: jest.fn().mockImplementation((cb) => cb(txApi)),
    _txApi: txApi,
  };
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const webhooks = { emit: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new SchoolCampaignsService(prisma as never, webhooks as never),
    webhooks,
  };
}

describe('SchoolCampaignsService', () => {
  it('lists pending campaigns for the school', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    await service.listForApproval('s1');
    expect(prisma.campaign.findMany).toHaveBeenCalledWith({
      where: { schoolId: 's1', status: 'PENDING_VERIFICATION' },
      include: { studentProfile: true, verification: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('approves a campaign (sets it LIVE) and emits a webhook', async () => {
    const prisma = buildPrisma();
    const { service, webhooks } = makeService(prisma);
    const updated = await service.approve('s1', 'c1', 'admin1', {});
    expect(updated.status).toBe('LIVE');
    expect(prisma._txApi.admissionVerification.upsert).toHaveBeenCalled();
    expect(webhooks.emit).toHaveBeenCalled();
  });

  it('approves with an explicit admissionRef and note', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    const updated = await service.approve('s1', 'c1', 'admin1', {
      admissionRef: 'ADM-7',
      note: 'looks good',
    });
    expect(updated.status).toBe('LIVE');
    expect(prisma._txApi.admissionVerification.upsert).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the school does not exist', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.approve('s1', 'c1', 'admin1', {}),
    ).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });

  it('blocks approval when the school is not yet active', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      onboardingStatus: 'SUBMITTED',
      payoutVerified: false,
    });
    const { service } = makeService(prisma);
    await expect(
      service.approve('s1', 'c1', 'admin1', {}),
    ).rejects.toMatchObject({
      response: { code: 'SCHOOL_NOT_ACTIVE' },
    });
  });

  it('rejects a campaign with a reason', async () => {
    const prisma = buildPrisma();
    const { service } = makeService(prisma);
    const updated = await service.reject(
      's1',
      'c1',
      'admin1',
      'Story incomplete',
    );
    expect(updated.status).toBe('REJECTED');
    expect(prisma._txApi.admissionVerification.upsert).toHaveBeenCalled();
  });

  it('throws when the campaign is not in this school', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findFirst.mockResolvedValue(null);
    const { service } = makeService(prisma);
    await expect(
      service.reject('s1', 'nope', 'admin1', 'x'),
    ).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });
});
