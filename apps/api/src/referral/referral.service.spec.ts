import { ReferralService } from './referral.service';
import { hashReferralCode } from './referral-code.util';

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
    referralLink: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    advocateInvite: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    referralAttribution: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    donation: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    ...overrides,
  } as never;
}

const service = (prisma: ReturnType<typeof buildPrisma>) =>
  new ReferralService(prisma);

describe('ReferralService', () => {
  describe('donorReferral', () => {
    it('creates a link on first access and reports zeroed stats', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue(null);
      (
        prisma as never as { referralLink: { create: jest.Mock } }
      ).referralLink.create.mockResolvedValue({
        id: 'link-1',
        donorUserId: 'donor-1',
        code: 'abc123',
        codeHash: 'h',
        optInLeaderboard: false,
      });
      (
        prisma as never as { referralAttribution: { findMany: jest.Mock } }
      ).referralAttribution.findMany.mockResolvedValue([]);
      (
        prisma as never as { user: { findUnique: jest.Mock } }
      ).user.findUnique.mockResolvedValue({ displayName: 'Generous Donor' });

      const view = await service(prisma).donorReferral('donor-1');

      expect(view.link.code).toBe('abc123');
      expect(view.link.shareUrl).toContain('/r/abc123');
      expect(view.stats.invited).toBe(0);
      expect(view.reward.tier).toBe('NONE');
      expect(view.reward.bothWin).toBe(false);
      expect(view.templates.email.subject).toContain('Generous Donor');
    });

    it('computes invited/donated/active + reward from attributions', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        donorUserId: 'donor-1',
        code: 'abc',
        codeHash: 'h',
        optInLeaderboard: true,
      });
      (
        prisma as never as { referralAttribution: { findMany: jest.Mock } }
      ).referralAttribution.findMany.mockResolvedValue([
        { donation: { status: 'SUCCEEDED', recurringPledgeId: 'r1' } },
        { donation: { status: 'PLEDGED', recurringPledgeId: null } },
        { donation: { status: 'FAILED', recurringPledgeId: null } },
      ]);
      (
        prisma as never as { user: { findUnique: jest.Mock } }
      ).user.findUnique.mockResolvedValue({ displayName: 'Donor' });

      const view = await service(prisma).donorReferral('donor-1');

      expect(view.stats.invited).toBe(3);
      expect(view.stats.donated).toBe(2);
      expect(view.stats.active).toBe(1);
      expect(view.optInLeaderboard).toBe(true);
    });
  });

  describe('setLeaderboardOptIn', () => {
    it('updates the opt-in flag', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        code: 'c',
        codeHash: 'h',
        optInLeaderboard: false,
      });
      (
        prisma as never as { referralLink: { update: jest.Mock } }
      ).referralLink.update.mockResolvedValue({ optInLeaderboard: true });

      const res = await service(prisma).setLeaderboardOptIn('donor-1', true);
      expect(res.optInLeaderboard).toBe(true);
    });
  });

  describe('referralLeaderboard', () => {
    it('ranks only opt-in donors with anonymised labels', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { referralLink: { findMany: jest.Mock } }
      ).referralLink.findMany.mockResolvedValue([
        { donorUserId: 'u1', _count: { attributions: 2 } },
        { donorUserId: 'u2', _count: { attributions: 5 } },
      ]);

      const { entries } = await service(prisma).referralLeaderboard();
      expect(entries[0]).toMatchObject({ id: 'u2', rank: 1, score: 5 });
      expect(entries[0].label).toBe('Supporter #1');
      expect(entries[1].label).toBe('Supporter #2');
    });
  });

  describe('inviteAdvocate', () => {
    const ownCampaign = {
      campaign: {
        findUnique: jest.fn().mockResolvedValue({
          studentProfile: { userId: 'student-1' },
          title: 'INSEAD MBA',
        }),
      },
    };

    it('rejects a non-owner with FORBIDDEN', async () => {
      const prisma = buildPrisma({
        campaign: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ studentProfile: { userId: 'other' } }),
        },
      });
      expect(
        await codeOf(() =>
          service(prisma).inviteAdvocate('student-1', 'c1', { name: 'A' }),
        ),
      ).toBe('FORBIDDEN');
    });

    it('rejects an unknown campaign with NOT_FOUND', async () => {
      const prisma = buildPrisma({
        campaign: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      expect(
        await codeOf(() =>
          service(prisma).inviteAdvocate('student-1', 'c1', { name: 'A' }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('rejects the 16th advocate with ADVOCATE_LIMIT', async () => {
      const prisma = buildPrisma(ownCampaign);
      (
        prisma as never as { advocateInvite: { count: jest.Mock } }
      ).advocateInvite.count.mockResolvedValue(15);
      expect(
        await codeOf(() =>
          service(prisma).inviteAdvocate('student-1', 'c1', { name: 'A' }),
        ),
      ).toBe('ADVOCATE_LIMIT');
    });

    it('creates an invite and returns the share link + templates once', async () => {
      const prisma = buildPrisma(ownCampaign);
      (
        prisma as never as { advocateInvite: { count: jest.Mock } }
      ).advocateInvite.count.mockResolvedValue(2);
      (
        prisma as never as { advocateInvite: { create: jest.Mock } }
      ).advocateInvite.create.mockImplementation(({ data }: never) =>
        Promise.resolve({ id: 'adv-1', name: (data as { name: string }).name }),
      );

      const res = await service(prisma).inviteAdvocate('student-1', 'c1', {
        name: 'Jordan',
        email: 'jordan@example.com',
      });

      expect(res.id).toBe('adv-1');
      expect(res.shareUrl).toMatch(/\/r\/[0-9a-f]+$/);
      expect(res.templates.whatsapp.body).toContain('INSEAD MBA');
      // Only the hash is persisted, never the raw code.
      const createArg = (
        prisma as never as { advocateInvite: { create: jest.Mock } }
      ).advocateInvite.create.mock.calls[0][0];
      expect(createArg.data.codeHash).toBeDefined();
      expect(createArg.data.code).toBeUndefined();
    });
  });

  describe('advocates dashboard', () => {
    it('ranks advocates and counts remaining slots', async () => {
      const prisma = buildPrisma({
        campaign: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ studentProfile: { userId: 'student-1' } }),
        },
      });
      (
        prisma as never as { advocateInvite: { findMany: jest.Mock } }
      ).advocateInvite.findMany.mockResolvedValue([
        { id: 'a', name: 'Ada', email: null, _count: { attributions: 6 } },
        { id: 'b', name: 'Bea', email: null, _count: { attributions: 3 } },
      ]);

      const view = await service(prisma).advocates('student-1', 'c1');
      expect(view.advocateCount).toBe(2);
      expect(view.remaining).toBe(13);
      expect(view.advocates[0]).toMatchObject({ id: 'a', rank: 1 });
      expect(view.advocates[0].reward.tier).toBe('SILVER');
      expect(view.leaderboard[0].id).toBe('a');
    });
  });

  describe('attributeDonation', () => {
    it('attributes a counted referral donation (deduped)', async () => {
      const code = 'feedface';
      const codeHash = hashReferralCode(code);
      const prisma = buildPrisma();
      (
        prisma as never as { donation: { findUnique: jest.Mock } }
      ).donation.findUnique.mockResolvedValue({
        id: 'd1',
        status: 'SUCCEEDED',
        donorUserId: 'donor-2',
      });
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        donorUserId: 'donor-1',
        codeHash,
      });
      (
        prisma as never as { advocateInvite: { findUnique: jest.Mock } }
      ).advocateInvite.findUnique.mockResolvedValue(null);
      (
        prisma as never as { referralAttribution: { findUnique: jest.Mock } }
      ).referralAttribution.findUnique.mockResolvedValue(null);
      const create = (
        prisma as never as { referralAttribution: { create: jest.Mock } }
      ).referralAttribution.create.mockResolvedValue({});

      await service(prisma).attributeDonation('d1', code);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'REFERRAL',
            donationId: 'd1',
            referralLinkId: 'link-1',
          }),
        }),
      );
    });

    it('skips self-referral without creating an attribution', async () => {
      const code = 'cafebabe';
      const codeHash = hashReferralCode(code);
      const prisma = buildPrisma();
      (
        prisma as never as { donation: { findUnique: jest.Mock } }
      ).donation.findUnique.mockResolvedValue({
        id: 'd1',
        status: 'SUCCEEDED',
        donorUserId: 'donor-1',
      });
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        donorUserId: 'donor-1',
        codeHash,
      });
      (
        prisma as never as { advocateInvite: { findUnique: jest.Mock } }
      ).advocateInvite.findUnique.mockResolvedValue(null);
      (
        prisma as never as { referralAttribution: { findUnique: jest.Mock } }
      ).referralAttribution.findUnique.mockResolvedValue(null);
      const create = (
        prisma as never as { referralAttribution: { create: jest.Mock } }
      ).referralAttribution.create;

      await service(prisma).attributeDonation('d1', code);
      expect(create).not.toHaveBeenCalled();
    });

    it('skips an already-attributed donation (dedupe)', async () => {
      const code = 'deadbeef';
      const codeHash = hashReferralCode(code);
      const prisma = buildPrisma();
      (
        prisma as never as { donation: { findUnique: jest.Mock } }
      ).donation.findUnique.mockResolvedValue({
        id: 'd1',
        status: 'SUCCEEDED',
        donorUserId: 'donor-2',
      });
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        donorUserId: 'donor-1',
        codeHash,
      });
      (
        prisma as never as { advocateInvite: { findUnique: jest.Mock } }
      ).advocateInvite.findUnique.mockResolvedValue(null);
      (
        prisma as never as { referralAttribution: { findUnique: jest.Mock } }
      ).referralAttribution.findUnique.mockResolvedValue({ id: 'existing' });
      const create = (
        prisma as never as { referralAttribution: { create: jest.Mock } }
      ).referralAttribution.create;

      await service(prisma).attributeDonation('d1', code);
      expect(create).not.toHaveBeenCalled();
    });

    it('attributes an advocate donation', async () => {
      const code = '0badc0de';
      const codeHash = hashReferralCode(code);
      const prisma = buildPrisma();
      (
        prisma as never as { donation: { findUnique: jest.Mock } }
      ).donation.findUnique.mockResolvedValue({
        id: 'd2',
        status: 'PLEDGED',
        donorUserId: 'donor-9',
      });
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue(null);
      (
        prisma as never as { advocateInvite: { findUnique: jest.Mock } }
      ).advocateInvite.findUnique.mockResolvedValue({
        id: 'adv-1',
        codeHash,
        status: 'ACTIVE',
      });
      (
        prisma as never as { referralAttribution: { findUnique: jest.Mock } }
      ).referralAttribution.findUnique.mockResolvedValue(null);
      const create = (
        prisma as never as { referralAttribution: { create: jest.Mock } }
      ).referralAttribution.create.mockResolvedValue({});

      await service(prisma).attributeDonation('d2', code);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'ADVOCATE',
            advocateInviteId: 'adv-1',
          }),
        }),
      );
    });

    it('never throws into the money path (swallows errors)', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as { donation: { findUnique: jest.Mock } }
      ).donation.findUnique.mockRejectedValue(new Error('db down'));
      (
        prisma as never as { referralLink: { findUnique: jest.Mock } }
      ).referralLink.findUnique.mockResolvedValue(null);
      (
        prisma as never as { advocateInvite: { findUnique: jest.Mock } }
      ).advocateInvite.findUnique.mockResolvedValue(null);
      (
        prisma as never as { referralAttribution: { findUnique: jest.Mock } }
      ).referralAttribution.findUnique.mockResolvedValue(null);

      await expect(
        service(prisma).attributeDonation('d1', 'whatever'),
      ).resolves.toBeUndefined();
    });

    it('does nothing for an empty code', async () => {
      const prisma = buildPrisma();
      await service(prisma).attributeDonation('d1', '');
      expect(
        (prisma as never as { donation: { findUnique: jest.Mock } }).donation
          .findUnique,
      ).not.toHaveBeenCalled();
    });
  });

  it('exposes the advocate cap', () => {
    expect(ReferralService.maxAdvocates()).toBe(15);
  });
});
