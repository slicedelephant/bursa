import { NotificationsService } from './notifications.service';

async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

function buildPrisma(over: Record<string, unknown> = {}) {
  return {
    notification: {
      create: jest.fn().mockResolvedValue({ id: 'n1' }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'n1', readAt: new Date() }),
      count: jest.fn().mockResolvedValue(0),
    },
    updateSubscription: {
      upsert: jest.fn().mockResolvedValue({ id: 's1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...over,
  };
}

function buildEmail() {
  return { log: jest.fn().mockResolvedValue({ id: 'e1' }) };
}

describe('NotificationsService', () => {
  it('onDonation subscribes, thanks the donor (in-app + email) and skips milestones when none crossed', async () => {
    const prisma = buildPrisma();
    const email = buildEmail();
    const svc = new NotificationsService(prisma as never, email as never);

    await svc.onDonation({
      donorUserId: 'u1',
      campaignId: 'c1',
      studentName: 'Amara',
      amountCents: 5000,
      prevRaised: 1000,
      newRaised: 2000,
      goalCents: 10000,
    });

    expect(prisma.updateSubscription.upsert).toHaveBeenCalled();
    // one in-app thank-you
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(email.log).toHaveBeenCalledTimes(1);
    // no milestone crossed -> never looked up subscribers
    expect(prisma.updateSubscription.findMany).not.toHaveBeenCalled();
  });

  it('onDonation fans milestone notifications out to all subscribers', async () => {
    const prisma = buildPrisma();
    prisma.updateSubscription.findMany.mockResolvedValue([
      { donorUserId: 'u1' },
      { donorUserId: 'u2' },
    ]);
    const email = buildEmail();
    const svc = new NotificationsService(prisma as never, email as never);

    await svc.onDonation({
      donorUserId: 'u1',
      campaignId: 'c1',
      studentName: 'Amara',
      amountCents: 5000,
      prevRaised: 7000,
      newRaised: 9500, // crosses 80 and 90
      goalCents: 10000,
    });

    // 1 thank-you + (2 milestones * 2 subscribers) = 5 in-app rows
    expect(prisma.notification.create).toHaveBeenCalledTimes(1 + 2 * 2);
  });

  it('onDonation for an anonymous donor only handles milestones, no thank-you', async () => {
    const prisma = buildPrisma();
    prisma.updateSubscription.findMany.mockResolvedValue([{ donorUserId: 'u9' }]);
    const email = buildEmail();
    const svc = new NotificationsService(prisma as never, email as never);

    await svc.onDonation({
      donorUserId: null,
      campaignId: 'c1',
      studentName: 'Amara',
      amountCents: 5000,
      prevRaised: 9500,
      newRaised: 10000, // crosses 100
      goalCents: 10000,
    });

    expect(prisma.updateSubscription.upsert).not.toHaveBeenCalled();
    // only the single goal-reached row to the one subscriber
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('onImpactUpdate notifies every subscriber, and no-ops with none', async () => {
    const prisma = buildPrisma();
    const email = buildEmail();
    const svc = new NotificationsService(prisma as never, email as never);

    await svc.onImpactUpdate({ campaignId: 'c1', studentName: 'Amara', updateTitle: 'Semester 1' });
    expect(prisma.notification.create).not.toHaveBeenCalled();

    prisma.updateSubscription.findMany.mockResolvedValue([
      { donorUserId: 'u1' },
      { donorUserId: 'u2' },
    ]);
    await svc.onImpactUpdate({ campaignId: 'c1', studentName: 'Amara', updateTitle: 'Semester 1' });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(email.log).toHaveBeenCalledTimes(2);
  });

  it('listForUser returns items and an unread count', async () => {
    const prisma = buildPrisma();
    prisma.notification.findMany.mockResolvedValue([{ id: 'n1', readAt: null }]);
    prisma.notification.count.mockResolvedValue(1);
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    const res = await svc.listForUser('u1');
    expect(res.items).toHaveLength(1);
    expect(res.unread).toBe(1);
  });

  it('markRead enforces ownership', async () => {
    const prisma = buildPrisma();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'owner' });
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    expect(await codeOf(() => svc.markRead('intruder', 'n1'))).toBe('FORBIDDEN');
  });

  it('markRead throws NOT_FOUND for an unknown notification', async () => {
    const prisma = buildPrisma();
    prisma.notification.findUnique.mockResolvedValue(null);
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    expect(await codeOf(() => svc.markRead('u1', 'missing'))).toBe('NOT_FOUND');
  });

  it('markRead sets readAt for the owner', async () => {
    const prisma = buildPrisma();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    await svc.markRead('u1', 'n1');
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { readAt: expect.any(Date) },
    });
  });

  it('deliver creates an in-app row without an email when not requested', async () => {
    const prisma = buildPrisma();
    const email = buildEmail();
    const svc = new NotificationsService(prisma as never, email as never);
    await svc.deliver('u1', { type: 'THANK_YOU', title: 'T', body: 'B' });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ channel: 'IN_APP', campaignId: null }),
    });
    expect(email.log).not.toHaveBeenCalled();
  });

  it('subscribe upserts on the compound key', async () => {
    const prisma = buildPrisma();
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    await svc.subscribe('u1', 'c1');
    expect(prisma.updateSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { donorUserId_campaignId: { donorUserId: 'u1', campaignId: 'c1' } },
      }),
    );
  });

  it('listSubscriptions maps campaign titles', async () => {
    const prisma = buildPrisma();
    prisma.updateSubscription.findMany.mockResolvedValue([
      { campaignId: 'c1', campaign: { title: 'Help Amara' }, createdAt: new Date() },
    ]);
    const svc = new NotificationsService(prisma as never, buildEmail() as never);
    const res = await svc.listSubscriptions('u1');
    expect(res[0]).toMatchObject({ campaignId: 'c1', campaignTitle: 'Help Amara' });
  });
});
