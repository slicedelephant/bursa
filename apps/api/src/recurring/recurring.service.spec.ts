import type { PaymentProvider } from '../payments/payment-provider.interface';
import { RecurringService } from './recurring.service';

async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

function buildTx() {
  return {
    donation: { create: jest.fn().mockResolvedValue({ id: 'd1' }) },
    campaign: { update: jest.fn().mockResolvedValue({}) },
    campaignUpdate: { create: jest.fn().mockResolvedValue({}) },
    recurringPledge: { update: jest.fn().mockResolvedValue({}) },
  };
}

function buildPrisma(tx = buildTx()) {
  return {
    tx,
    prisma: {
      recurringPledge: {
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'r1', status: 'PAUSED' }),
      },
      campaign: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    },
  };
}

function provider(): jest.Mocked<PaymentProvider> {
  return {
    createCardCharge: jest.fn(),
    createSepaPledge: jest.fn(),
    createPayout: jest.fn(),
    savePledge: jest.fn(),
    captureOnGoalReached: jest.fn(),
    payoutToSchool: jest.fn(),
  } as unknown as jest.Mocked<PaymentProvider>;
}

function notifications() {
  return {
    subscribe: jest.fn().mockResolvedValue({}),
    deliver: jest.fn().mockResolvedValue({}),
    onDonation: jest.fn().mockResolvedValue(undefined),
  };
}

const liveCampaign = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  status: 'LIVE',
  currency: 'EUR',
  goalCents: 10000,
  raisedCents: 2000,
  tipsCents: 0,
  verification: { status: 'VERIFIED' },
  studentProfile: { fullName: 'Amara' },
  ...over,
});

describe('RecurringService', () => {
  it('creates a pledge for a live campaign and subscribes the donor', async () => {
    const { prisma } = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(liveCampaign());
    const notif = notifications();
    const svc = new RecurringService(prisma as never, provider(), notif as never);

    await svc.create('u1', { campaignId: 'c1', amountCents: 2500 });

    expect(prisma.recurringPledge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ donorUserId: 'u1', amountCents: 2500 }),
      }),
    );
    expect(notif.subscribe).toHaveBeenCalledWith('u1', 'c1');
  });

  it('rejects recurring setup for a non-live campaign', async () => {
    const { prisma } = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(liveCampaign({ status: 'FUNDED' }));
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    expect(await codeOf(() => svc.create('u1', { campaignId: 'c1', amountCents: 2500 }))).toBe(
      'VALIDATION_ERROR',
    );
  });

  it('rejects recurring setup for an unknown campaign', async () => {
    const { prisma } = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(null);
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    expect(await codeOf(() => svc.create('u1', { campaignId: 'x', amountCents: 2500 }))).toBe(
      'VALIDATION_ERROR',
    );
  });

  it('lists the donor’s pledges', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([{ id: 'r1' }]);
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    const res = await svc.list('u1');
    expect(res).toEqual([{ id: 'r1' }]);
    expect(prisma.recurringPledge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { donorUserId: 'u1' } }),
    );
  });

  it('resumes a paused pledge for its owner', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findUnique.mockResolvedValue({ id: 'r1', donorUserId: 'u1' });
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    await svc.resume('u1', 'r1');
    expect(prisma.recurringPledge.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('throws NOT_FOUND when acting on an unknown pledge', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findUnique.mockResolvedValue(null);
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    expect(await codeOf(() => svc.cancel('u1', 'missing'))).toBe('NOT_FOUND');
  });

  it('runDue marks the campaign FUNDED and posts a goal update when a charge fills the gap', async () => {
    const { prisma, tx } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([
      {
        id: 'r1',
        donorUserId: 'u1',
        campaignId: 'c1',
        amountCents: 5000,
        currency: 'EUR',
        chargesCount: 1,
        totalChargedCents: 5000,
        donorUser: null, // exercise the donorName-null branch
      },
    ]);
    prisma.campaign.findUnique.mockResolvedValue(liveCampaign({ raisedCents: 8000 }));
    const pay = provider();
    pay.createCardCharge.mockResolvedValue({ status: 'SUCCEEDED', reference: 'ch_2' });
    const svc = new RecurringService(prisma as never, pay, notifications() as never);

    const res = await svc.runDue('u1', new Date('2026-06-27T00:00:00Z'));

    expect(res.charged).toHaveLength(1);
    expect(tx.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FUNDED' }) }),
    );
    expect(tx.campaignUpdate.create).toHaveBeenCalled();
    expect(tx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ donorName: null }) }),
    );
  });

  it('enforces ownership on pause/cancel', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findUnique.mockResolvedValue({ id: 'r1', donorUserId: 'owner' });
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    expect(await codeOf(() => svc.pause('intruder', 'r1'))).toBe('FORBIDDEN');
  });

  it('cancels a pledge for its owner', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findUnique.mockResolvedValue({ id: 'r1', donorUserId: 'u1' });
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    await svc.cancel('u1', 'r1');
    expect(prisma.recurringPledge.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'CANCELLED' },
    });
  });

  it('runDue charges a due pledge, records a donation and notifies', async () => {
    const { prisma, tx } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([
      {
        id: 'r1',
        donorUserId: 'u1',
        campaignId: 'c1',
        amountCents: 2500,
        currency: 'EUR',
        chargesCount: 0,
        totalChargedCents: 0,
        donorUser: { displayName: 'Generous Donor' },
      },
    ]);
    prisma.campaign.findUnique.mockResolvedValue(liveCampaign());
    const pay = provider();
    pay.createCardCharge.mockResolvedValue({ status: 'SUCCEEDED', reference: 'ch_1' });
    const notif = notifications();
    const svc = new RecurringService(prisma as never, pay, notif as never);

    const res = await svc.runDue('u1', new Date('2026-06-27T00:00:00Z'));

    expect(pay.createCardCharge).toHaveBeenCalledTimes(1);
    expect(tx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recurringPledgeId: 'r1',
          status: 'SUCCEEDED',
          donorName: 'Generous Donor',
        }),
      }),
    );
    expect(res.charged).toHaveLength(1);
    expect(res.charged[0]).toMatchObject({ pledgeId: 'r1', amountCents: 2500 });
    expect(notif.deliver).toHaveBeenCalled();
    expect(notif.onDonation).toHaveBeenCalled();
  });

  it('runDue records a failed charge without a donation', async () => {
    const { prisma, tx } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([
      {
        id: 'r1',
        donorUserId: 'u1',
        campaignId: 'c1',
        amountCents: 2513,
        currency: 'EUR',
        chargesCount: 0,
        totalChargedCents: 0,
        donorUser: { displayName: 'D' },
      },
    ]);
    prisma.campaign.findUnique.mockResolvedValue(liveCampaign());
    const pay = provider();
    pay.createCardCharge.mockResolvedValue({
      status: 'FAILED',
      reference: 'ch_x',
      failureReason: 'declined',
    });
    const svc = new RecurringService(prisma as never, pay, notifications() as never);

    const res = await svc.runDue('u1');
    expect(res.failed).toEqual(['r1']);
    expect(res.charged).toHaveLength(0);
    expect(tx.donation.create).not.toHaveBeenCalled();
  });

  it('runDue cancels the pledge when the campaign is no longer donatable', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([
      {
        id: 'r1',
        donorUserId: 'u1',
        campaignId: 'c1',
        amountCents: 2500,
        currency: 'EUR',
        chargesCount: 0,
        totalChargedCents: 0,
        donorUser: { displayName: 'D' },
      },
    ]);
    prisma.campaign.findUnique.mockResolvedValue(
      liveCampaign({ status: 'FUNDED', raisedCents: 10000 }),
    );
    const pay = provider();
    const svc = new RecurringService(prisma as never, pay, notifications() as never);

    const res = await svc.runDue('u1');
    expect(res.cancelled).toEqual(['r1']);
    expect(pay.createCardCharge).not.toHaveBeenCalled();
    expect(prisma.recurringPledge.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'CANCELLED' },
    });
  });

  it('runDue with no due pledges returns empty buckets', async () => {
    const { prisma } = buildPrisma();
    prisma.recurringPledge.findMany.mockResolvedValue([]);
    const svc = new RecurringService(prisma as never, provider(), notifications() as never);
    const res = await svc.runDue('u1');
    expect(res).toEqual({ charged: [], failed: [], cancelled: [] });
  });
});
