import { DonationsService } from './donations.service';
import type { PaymentProvider } from '../payments/payment-provider.interface';

/** Notifications collaborator stub — donor-retention side-effects are tested separately. */
const notif = () => ({ onDonation: jest.fn().mockResolvedValue(undefined) });

/** Runs an action and returns the DomainException `code` it throws. */
async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

/** Builds a tx double whose methods can be asserted/overridden per test. */
function buildTx(overrides: Record<string, unknown> = {}) {
  return {
    donation: {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    campaign: {
      update: jest.fn(),
    },
    campaignUpdate: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function buildPrisma(tx: ReturnType<typeof buildTx>) {
  return {
    campaign: { findUnique: jest.fn() },
    donation: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    corporateProfile: { findUnique: jest.fn() },
    school: { findUnique: jest.fn() },
    $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
  };
}

const verifiedLiveCampaign = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  schoolId: 's1',
  title: 'Help Amara study',
  currency: 'EUR',
  goalCents: 10000,
  raisedCents: 0,
  tipsCents: 0,
  status: 'LIVE',
  verification: { status: 'VERIFIED' },
  ...over,
});

describe('DonationsService (All-or-Nothing card flow)', () => {
  const provider = (): jest.Mocked<PaymentProvider> =>
    ({
      savePledge: jest.fn(),
      captureOnGoalReached: jest.fn(),
      createCardCharge: jest.fn(),
      createSepaPledge: jest.fn(),
      createPayout: jest.fn(),
      payoutToSchool: jest.fn(),
    }) as unknown as jest.Mocked<PaymentProvider>;

  it('records a PLEDGE (no charge) when the goal is not yet reached', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'd1',
      status: 'PLEDGED',
      amountCents: 5000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: 'Jane',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 5000, status: 'LIVE' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());

    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'AUTHORIZED',
      pledgeRef: 'pl_1',
    });

    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    const res = await service.donateCard('c1', { amountCents: 5000 });

    expect(pay.savePledge).toHaveBeenCalled();
    expect(pay.captureOnGoalReached).not.toHaveBeenCalled();
    expect(res.donation.status).toBe('PLEDGED');
    expect(res.campaign.status).toBe('LIVE');
    expect(res.campaign.percent).toBe(50);
  });

  it('captures every pledge and issues a receipt once the goal is reached', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'd2',
      status: 'PLEDGED',
      amountCents: 4000,
      tipCents: 1000,
      createdAt: new Date(),
      donorName: 'Jane',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 10000, status: 'FUNDED' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 6000 }),
    );
    prisma.donation.findMany.mockResolvedValue([
      { id: 'd2', amountCents: 4000, tipCents: 1000, pledgeRef: 'pl_2' },
    ]);
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd2',
      status: 'CAPTURED',
      amountCents: 4000,
      tipCents: 1000,
      createdAt: new Date(),
      donorName: 'Jane',
    });

    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'AUTHORIZED',
      pledgeRef: 'pl_2',
    });
    pay.captureOnGoalReached.mockResolvedValue({
      status: 'SUCCEEDED',
      reference: 'cap_2',
    });

    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    const res = await service.donateCard('c1', { amountCents: 5000 });

    expect(pay.captureOnGoalReached).toHaveBeenCalledTimes(1);
    expect(res.capture?.capturedIds).toEqual(['d2']);
    expect(res.capture?.capturedCents).toBe(4000);
    expect(res.donation.status).toBe('CAPTURED');
    expect(res.receipt).toBeDefined();
    expect(res.campaign.status).toBe('FUNDED');
  });

  it('records a FAILED donation and throws when the pledge is not authorized', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    prisma.donation.create.mockResolvedValue({ id: 'df' });

    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'FAILED',
      pledgeRef: 'pl_x',
      failureReason: 'declined',
    });

    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );

    expect(
      await codeOf(() => service.donateCard('c1', { amountCents: 5013 })),
    ).toBe('PAYMENT_FAILED');
    expect(prisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('rejects donations to a campaign that is not live/verified', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(null);
    const service = new DonationsService(
      prisma as never,
      provider(),
      notif() as never,
    );
    expect(
      await codeOf(() => service.donateCard('missing', { amountCents: 5000 })),
    ).toBe('NOT_FOUND');
  });

  it('throws when capturing an unknown campaign', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(null);
    const service = new DonationsService(
      prisma as never,
      provider(),
      notif() as never,
    );
    expect(await codeOf(() => service.captureCampaign('nope'))).toBe(
      'NOT_FOUND',
    );
  });

  it('processes a corporate SEPA donation immediately with a receipt', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'sd1',
      status: 'SUCCEEDED',
      amountCents: 8000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: 'ACME',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 8000, status: 'LIVE' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    prisma.corporateProfile.findUnique.mockResolvedValue({
      id: 'corp1',
      companyName: 'ACME',
    });
    prisma.school.findUnique.mockResolvedValue({ name: 'ESMT Berlin' });

    const pay = provider();
    pay.createSepaPledge.mockResolvedValue({
      status: 'SUCCEEDED',
      reference: 'sepa_1',
    });

    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    const res = await service.donateSepa('c1', 'u1', { amountCents: 8000 });

    expect(res.receipt.donor).toBe('ACME');
    expect(res.donation.status).toBe('SUCCEEDED');
  });

  it('records a FAILED SEPA donation and throws on provider failure', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    prisma.corporateProfile.findUnique.mockResolvedValue({
      id: 'corp1',
      companyName: 'ACME',
    });
    prisma.donation.create.mockResolvedValue({ id: 'sdf' });
    const pay = provider();
    pay.createSepaPledge.mockResolvedValue({
      status: 'FAILED',
      reference: 'sepa_x',
      failureReason: 'mandate rejected',
    });
    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    expect(
      await codeOf(() => service.donateSepa('c1', 'u1', { amountCents: 8000 })),
    ).toBe('PAYMENT_FAILED');
  });

  it('requires a corporate profile before a SEPA pledge', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    prisma.corporateProfile.findUnique.mockResolvedValue(null);
    const service = new DonationsService(
      prisma as never,
      provider(),
      notif() as never,
    );
    expect(
      await codeOf(() => service.donateSepa('c1', 'u1', { amountCents: 8000 })),
    ).toBe('VALIDATION_ERROR');
  });

  it('captureCampaign skips pledges without a ref and reports failed captures', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    prisma.donation.findMany.mockResolvedValue([
      { id: 'pa', amountCents: 1000, tipCents: 0, pledgeRef: null },
      { id: 'pb', amountCents: 2000, tipCents: 0, pledgeRef: 'rb' },
    ]);
    const pay = provider();
    pay.captureOnGoalReached.mockResolvedValue({
      status: 'FAILED',
      reference: 'x',
      failureReason: 'auth required',
    });
    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    const summary = await service.captureCampaign('c1');
    expect(summary.capturedIds).toEqual([]);
    expect(summary.failedIds).toEqual(['pa', 'pb']);
    expect(tx.donation.update).not.toHaveBeenCalled();
  });

  it('marks the campaign FUNDED and posts a system update when SEPA reaches the goal', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'sd2',
      status: 'SUCCEEDED',
      amountCents: 4000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: 'ACME',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 10000, status: 'FUNDED' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 6000 }),
    );
    prisma.corporateProfile.findUnique.mockResolvedValue({
      id: 'corp1',
      companyName: 'ACME',
    });
    prisma.school.findUnique.mockResolvedValue({ name: 'ESMT Berlin' });
    const pay = provider();
    pay.createSepaPledge.mockResolvedValue({
      status: 'SUCCEEDED',
      reference: 'sepa_2',
    });
    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    const res = await service.donateSepa('c1', 'u1', { amountCents: 8000 });
    expect(res.campaign.status).toBe('FUNDED');
    expect(tx.campaignUpdate.create).toHaveBeenCalled();
  });

  it('rejects donations once a campaign is no longer LIVE', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(
      verifiedLiveCampaign({ status: 'FUNDED', raisedCents: 10000 }),
    );
    const service = new DonationsService(
      prisma as never,
      provider(),
      notif() as never,
    );
    expect(
      await codeOf(() => service.donateCard('c1', { amountCents: 5000 })),
    ).toBe('CAMPAIGN_FULLY_FUNDED');
  });

  it('rejects donations once the goal amount is already met while LIVE', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(
      verifiedLiveCampaign({ status: 'LIVE', raisedCents: 10000 }),
    );
    const service = new DonationsService(
      prisma as never,
      provider(),
      notif() as never,
    );
    expect(
      await codeOf(() => service.donateCard('c1', { amountCents: 5000 })),
    ).toBe('CAMPAIGN_FULLY_FUNDED');
  });

  it('attributes the donation to a logged-in donor and fires onDonation', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'd1',
      status: 'PLEDGED',
      amountCents: 5000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: 'Jane',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 5000, status: 'LIVE' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'AUTHORIZED',
      pledgeRef: 'pl_1',
    });
    const notifications = notif();

    const service = new DonationsService(
      prisma as never,
      pay,
      notifications as never,
    );
    await service.donateCard('c1', { amountCents: 5000 }, 'donor-1');

    expect(tx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ donorUserId: 'donor-1' }),
      }),
    );
    expect(notifications.onDonation).toHaveBeenCalledWith(
      expect.objectContaining({ donorUserId: 'donor-1', campaignId: 'c1' }),
    );
  });

  it('persists a tribute (honour/memory) on the pledge', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'd1',
      status: 'PLEDGED',
      amountCents: 5000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: 'Jane',
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 5000, status: 'LIVE' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'AUTHORIZED',
      pledgeRef: 'pl_1',
    });

    const service = new DonationsService(
      prisma as never,
      pay,
      notif() as never,
    );
    await service.donateCard('c1', {
      amountCents: 5000,
      tributeType: 'MEMORY',
      tributeName: 'Ada',
    });

    expect(tx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tributeType: 'MEMORY',
          tributeName: 'Ada',
        }),
      }),
    );
  });

  it('fires onDonation with a null donor for an anonymous (logged-out) gift', async () => {
    const tx = buildTx();
    tx.donation.create.mockResolvedValue({
      id: 'd1',
      status: 'PLEDGED',
      amountCents: 5000,
      tipCents: 0,
      createdAt: new Date(),
      donorName: null,
    });
    tx.campaign.update.mockResolvedValue(
      verifiedLiveCampaign({ raisedCents: 5000, status: 'LIVE' }),
    );
    const prisma = buildPrisma(tx);
    prisma.campaign.findUnique.mockResolvedValue(verifiedLiveCampaign());
    const pay = provider();
    pay.savePledge.mockResolvedValue({
      status: 'AUTHORIZED',
      pledgeRef: 'pl_1',
    });
    const notifications = notif();

    const service = new DonationsService(
      prisma as never,
      pay,
      notifications as never,
    );
    await service.donateCard('c1', { amountCents: 5000 });

    expect(notifications.onDonation).toHaveBeenCalledWith(
      expect.objectContaining({ donorUserId: null }),
    );
  });
});
