import { ImpactFeedService } from './impact-feed.service';
import { MockMessagingProvider } from './messaging/mock-messaging.provider';

/** Runs an action and returns the DomainException `code` it throws. */
async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    donation: { findMany: jest.fn(), findFirst: jest.fn() },
    updateSubscription: { findMany: jest.fn() },
    campaign: { findMany: jest.fn(), findUnique: jest.fn() },
    campaignUpdate: { findMany: jest.fn() },
    studentMessage: { findMany: jest.fn(), create: jest.fn() },
    feedRead: { findMany: jest.fn(), upsert: jest.fn() },
    notificationChannelPref: { findMany: jest.fn(), upsert: jest.fn() },
    ...overrides,
  } as never;
}

function make(prisma: ReturnType<typeof buildPrisma>) {
  const provider = new MockMessagingProvider();
  return { service: new ImpactFeedService(prisma, provider), provider };
}

function asMock<T = jest.Mock>(prisma: unknown, path: string): T {
  return path
    .split('.')
    .reduce((o: never, k) => (o as never)[k], prisma as never);
}

describe('ImpactFeedService', () => {
  describe('feed', () => {
    it('builds a sorted feed with read flags and a read streak', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findMany').mockResolvedValue([
        { campaignId: 'c1' },
      ]);
      asMock(prisma, 'updateSubscription.findMany').mockResolvedValue([]);
      asMock(prisma, 'campaign.findMany').mockResolvedValue([
        {
          id: 'c1',
          raisedCents: 0,
          goalCents: 100000,
          studentProfile: { fullName: 'Amara', photoUrl: 'p.jpg' },
        },
      ]);
      asMock(prisma, 'campaignUpdate.findMany').mockResolvedValue([
        {
          id: 'u1',
          campaignId: 'c1',
          title: 'Exams passed',
          body: 'Distinction',
          createdAt: new Date('2026-06-20T00:00:00Z'),
        },
      ]);
      asMock(prisma, 'studentMessage.findMany').mockResolvedValue([
        {
          id: 'm1',
          campaignId: 'c1',
          text: 'Thank you',
          videoUrl: null,
          voiceUrl: null,
          createdAt: new Date('2026-06-28T00:00:00Z'),
        },
      ]);
      asMock(prisma, 'feedRead.findMany').mockResolvedValue([
        { feedItemKey: 'update:u1', readAt: new Date('2026-06-21T00:00:00Z') },
      ]);

      const { service } = make(prisma);
      const res = await service.feed(
        'donor-1',
        new Date('2026-06-30T00:00:00Z'),
      );

      expect(res.items[0].key).toBe('voice:m1'); // newest first
      expect(res.items.find((i) => i.key === 'update:u1')?.read).toBe(true);
      expect(res.unreadCount).toBeGreaterThanOrEqual(1);
      expect(res.readStreak.currentMonths).toBe(1);
    });

    it('returns an empty feed for a donor supporting nothing', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findMany').mockResolvedValue([]);
      asMock(prisma, 'updateSubscription.findMany').mockResolvedValue([]);
      asMock(prisma, 'feedRead.findMany').mockResolvedValue([]);

      const { service } = make(prisma);
      const res = await service.feed(
        'donor-1',
        new Date('2026-06-30T00:00:00Z'),
      );
      expect(res.items).toEqual([]);
      expect(res.unreadCount).toBe(0);
    });

    it('emits a derived funding milestone card when a campaign is partly funded', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findMany').mockResolvedValue([
        { campaignId: 'c1' },
      ]);
      asMock(prisma, 'updateSubscription.findMany').mockResolvedValue([]);
      asMock(prisma, 'campaign.findMany').mockResolvedValue([
        {
          id: 'c1',
          raisedCents: 85000,
          goalCents: 100000,
          studentProfile: { fullName: 'Amara', photoUrl: null },
        },
      ]);
      asMock(prisma, 'campaignUpdate.findMany').mockResolvedValue([]);
      asMock(prisma, 'studentMessage.findMany').mockResolvedValue([]);
      asMock(prisma, 'feedRead.findMany').mockResolvedValue([]);

      const { service } = make(prisma);
      const res = await service.feed(
        'donor-1',
        new Date('2026-06-30T00:00:00Z'),
      );
      const milestone = res.items.find((i) => i.kind === 'MILESTONE');
      expect(milestone).toBeDefined();
      expect(milestone?.key).toBe('milestone:c1:80');
    });
  });

  describe('markRead', () => {
    it('upserts a feed-read idempotently', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'feedRead.upsert').mockResolvedValue({});
      const { service } = make(prisma);

      const res = await service.markRead('donor-1', 'voice:m1');
      expect(res).toEqual({ read: true });
      expect(asMock(prisma, 'feedRead.upsert')).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_feedItemKey: { userId: 'donor-1', feedItemKey: 'voice:m1' },
          },
        }),
      );
    });
  });

  describe('channelPrefs', () => {
    it('always reports IN_APP as on and merges stored opt-ins', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'notificationChannelPref.findMany').mockResolvedValue([
        { channel: 'WHATSAPP', optIn: true, handle: '+49' },
      ]);
      const { service } = make(prisma);

      const { prefs } = await service.channelPrefs('donor-1');
      expect(prefs.find((p) => p.channel === 'IN_APP')?.optIn).toBe(true);
      expect(prefs.find((p) => p.channel === 'WHATSAPP')).toMatchObject({
        optIn: true,
        handle: '+49',
      });
      expect(prefs.find((p) => p.channel === 'TELEGRAM')?.optIn).toBe(false);
    });
  });

  describe('setChannelPref', () => {
    it('rejects turning IN_APP off/on', async () => {
      const prisma = buildPrisma();
      const { service } = make(prisma);
      const code = await codeOf(() =>
        service.setChannelPref('donor-1', { channel: 'IN_APP', optIn: false }),
      );
      expect(code).toBe('INVALID_CHANNEL');
    });

    it('upserts an opt-in for an external channel', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'notificationChannelPref.upsert').mockResolvedValue({});
      const { service } = make(prisma);

      const res = await service.setChannelPref('donor-1', {
        channel: 'WHATSAPP',
        optIn: true,
        handle: '+49',
      });
      expect(res).toEqual({ channel: 'WHATSAPP', optIn: true });
    });
  });

  describe('submitVoice', () => {
    function ownedCampaign(prisma: ReturnType<typeof buildPrisma>) {
      asMock(prisma, 'campaign.findUnique').mockResolvedValue({
        studentProfile: { userId: 'student-1' },
      });
    }

    it('rejects a foreign campaign', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'campaign.findUnique').mockResolvedValue({
        studentProfile: { userId: 'someone-else' },
      });
      const { service } = make(prisma);

      const code = await codeOf(() =>
        service.submitVoice('student-1', 'c1', { text: 'Hi' }),
      );
      expect(code).toBe('FORBIDDEN');
    });

    it('rejects a missing campaign', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'campaign.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);

      const code = await codeOf(() =>
        service.submitVoice('student-1', 'missing', { text: 'Hi' }),
      );
      expect(code).toBe('NOT_FOUND');
    });

    it('approves but delivers nothing when no donor opted into a messenger', async () => {
      const prisma = buildPrisma();
      ownedCampaign(prisma);
      asMock(prisma, 'studentMessage.create').mockResolvedValue({
        id: 'm3',
        status: 'APPROVED',
      });
      // audience comes from a counted donation (not a subscription) this time
      asMock(prisma, 'updateSubscription.findMany').mockResolvedValue([]);
      asMock(prisma, 'donation.findMany').mockResolvedValue([
        { donorUserId: 'd2' },
      ]);
      asMock(prisma, 'notificationChannelPref.findMany').mockResolvedValue([]);

      const { service, provider } = make(prisma);
      const res = await service.submitVoice('student-1', 'c1', {
        text: 'Thank you!',
      });
      expect(res.status).toBe('APPROVED');
      expect(res.delivered).toBe(0);
      expect(provider.count).toBe(0);
    });

    it('approves a clean voice and fans it out to opted-in donors', async () => {
      const prisma = buildPrisma();
      ownedCampaign(prisma);
      asMock(prisma, 'studentMessage.create').mockResolvedValue({
        id: 'm1',
        status: 'APPROVED',
      });
      asMock(prisma, 'updateSubscription.findMany').mockResolvedValue([
        { donorUserId: 'd1' },
      ]);
      asMock(prisma, 'donation.findMany').mockResolvedValue([]);
      asMock(prisma, 'notificationChannelPref.findMany').mockResolvedValue([
        { userId: 'd1', channel: 'WHATSAPP', optIn: true, handle: '+49' },
      ]);

      const { service, provider } = make(prisma);
      const res = await service.submitVoice('student-1', 'c1', {
        text: 'Thank you for supporting my MBA journey.',
        videoUrl: 'https://example.com/t.mp4',
      });

      expect(res.status).toBe('APPROVED');
      expect(res.delivered).toBe(1);
      expect(provider.count).toBe(1);
    });

    it('rejects a voice with a slur and sends nothing', async () => {
      const prisma = buildPrisma();
      ownedCampaign(prisma);
      asMock(prisma, 'studentMessage.create').mockResolvedValue({
        id: 'm2',
        status: 'REJECTED',
      });
      const { service, provider } = make(prisma);

      const res = await service.submitVoice('student-1', 'c1', {
        text: 'you idiot',
      });
      expect(res.status).toBe('REJECTED');
      expect(res.reasons).toContain('slur:idiot');
      expect(res.delivered).toBe(0);
      expect(provider.count).toBe(0);
    });
  });

  describe('inactivity', () => {
    it('returns a reminder for a lapsed donor', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findFirst').mockResolvedValue({
        createdAt: new Date('2026-03-01T00:00:00Z'),
        campaignId: 'c1',
        campaign: { studentProfile: { fullName: 'Amara' } },
      });
      const { service } = make(prisma);

      const res = await service.inactivity(
        'donor-1',
        new Date('2026-06-15T00:00:00Z'),
      );
      expect(res.inactive).toBe(true);
      expect(res.shouldRemind).toBe(true);
      expect(res.reminder?.ctaUrl).toContain('/campaigns/c1?ref=reminder');
    });

    it('returns no reminder for a recently active donor', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findFirst').mockResolvedValue({
        createdAt: new Date('2026-06-10T00:00:00Z'),
        campaignId: 'c1',
        campaign: { studentProfile: { fullName: 'Amara' } },
      });
      const { service } = make(prisma);

      const res = await service.inactivity(
        'donor-1',
        new Date('2026-06-15T00:00:00Z'),
      );
      expect(res.shouldRemind).toBe(false);
      expect(res.reminder).toBeUndefined();
    });

    it('returns no reminder for a never-donated donor', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'donation.findFirst').mockResolvedValue(null);
      const { service } = make(prisma);

      const res = await service.inactivity(
        'donor-1',
        new Date('2026-06-15T00:00:00Z'),
      );
      expect(res.inactive).toBe(false);
      expect(res.reminder).toBeUndefined();
    });
  });
});
