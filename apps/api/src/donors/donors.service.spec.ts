import { DonorsService } from './donors.service';

async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

function buildPrisma() {
  return {
    donation: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    recurringPledge: { count: jest.fn().mockResolvedValue(0) },
  };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  campaignId: 'c1',
  campaign: { title: 'Help Amara', school: { name: 'ESMT Berlin' } },
  amountCents: 5000,
  currency: 'EUR',
  status: 'CAPTURED',
  method: 'CARD',
  tributeType: null,
  tributeName: null,
  anonymous: false,
  recurringPledgeId: null,
  createdAt: new Date(),
  ...over,
});

describe('DonorsService', () => {
  it('builds history with a summary and tribute line', async () => {
    const prisma = buildPrisma();
    prisma.donation.findMany.mockResolvedValue([
      row({ tributeType: 'HONOR', tributeName: 'Prof. Mensah' }),
      row({ id: 'd2', campaignId: 'c2', amountCents: 3000, recurringPledgeId: 'r1' }),
      row({ id: 'd3', status: 'FAILED', amountCents: 9999 }),
    ]);
    prisma.recurringPledge.count.mockResolvedValue(1);
    const svc = new DonorsService(prisma as never);

    const res = await svc.history('u1');

    expect(res.summary).toEqual({
      totalDonatedCents: 8000, // 5000 + 3000, FAILED excluded
      donationCount: 2,
      campaignsSupported: 2,
      repeatDonor: true,
      activeRecurringCount: 1,
    });
    expect(res.donations[0].tribute).toBe('In honour of Prof. Mensah');
    expect(res.donations[1].recurring).toBe(true);
  });

  it('flags a single-donation donor as not a repeat donor', async () => {
    const prisma = buildPrisma();
    prisma.donation.findMany.mockResolvedValue([row()]);
    const svc = new DonorsService(prisma as never);
    const res = await svc.history('u1');
    expect(res.summary.repeatDonor).toBe(false);
    expect(res.summary.donationCount).toBe(1);
  });

  it('returns a receipt for the owner', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorUserId: 'u1',
      donorName: 'Jane',
      amountCents: 5000,
      currency: 'EUR',
      createdAt: new Date(),
      campaign: { title: 'Help Amara', school: { name: 'ESMT Berlin' } },
      donorUser: { displayName: 'Jane Doe' },
    });
    const svc = new DonorsService(prisma as never);
    const receipt = await svc.receipt('u1', 'd1');
    expect(receipt.donor).toBe('Jane');
    expect(receipt.school).toBe('ESMT Berlin');
  });

  it('falls back to the account display name on the receipt', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({
      id: 'd1',
      donorUserId: 'u1',
      donorName: null,
      amountCents: 5000,
      currency: 'EUR',
      createdAt: new Date(),
      campaign: { title: 'Help Amara', school: { name: 'ESMT Berlin' } },
      donorUser: { displayName: 'Jane Doe' },
    });
    const svc = new DonorsService(prisma as never);
    const receipt = await svc.receipt('u1', 'd1');
    expect(receipt.donor).toBe('Jane Doe');
  });

  it('rejects a receipt request for someone else’s donation', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue({ id: 'd1', donorUserId: 'owner' });
    const svc = new DonorsService(prisma as never);
    expect(await codeOf(() => svc.receipt('intruder', 'd1'))).toBe('FORBIDDEN');
  });

  it('throws NOT_FOUND for an unknown donation', async () => {
    const prisma = buildPrisma();
    prisma.donation.findUnique.mockResolvedValue(null);
    const svc = new DonorsService(prisma as never);
    expect(await codeOf(() => svc.receipt('u1', 'missing'))).toBe('NOT_FOUND');
  });
});
