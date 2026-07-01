import { GroupsService } from './groups.service';
import { createGroupInvite } from './group-invite';

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
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    groupMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    groupInvite: { create: jest.fn(), findMany: jest.fn() },
    groupCampaign: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    groupContribution: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    groupVote: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    groupVoteBallot: { create: jest.fn(), findUnique: jest.fn() },
    groupMessage: { create: jest.fn(), findMany: jest.fn() },
    donation: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn() },
    ...overrides,
  } as never;
}

function buildCorporate() {
  return {
    sponsor: jest.fn().mockResolvedValue({ donation: { id: 'd' } }),
  } as never;
}

function make(
  prisma: ReturnType<typeof buildPrisma>,
  corporate = buildCorporate(),
) {
  return { service: new GroupsService(prisma, corporate), corporate };
}

function asMock(prisma: unknown, path: string): jest.Mock {
  return path
    .split('.')
    .reduce((o: never, k) => (o as never)[k], prisma as never) as jest.Mock;
}

describe('GroupsService', () => {
  describe('create', () => {
    it('creates a group with the creator as ADMIN', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.create').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      const { service } = make(prisma);
      const result = await service.create('u1', {
        mode: 'GIVING_CIRCLE',
        name: 'Circle',
      } as never);
      expect(result).toEqual({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
        role: 'ADMIN',
      });
      expect(asMock(prisma, 'group.create')).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            members: { create: { userId: 'u1', role: 'ADMIN' } },
          }),
        }),
      );
    });
  });

  describe('join', () => {
    it('adds a member when the invite token is valid', async () => {
      const prisma = buildPrisma();
      const invite = createGroupInvite('CONTRIBUTOR');
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PRIVATE',
      });
      asMock(prisma, 'groupInvite.findMany').mockResolvedValue([
        {
          codeHash: invite.codeHash,
          status: 'ACTIVE',
          role: 'CONTRIBUTOR',
          expiresAt: null,
        },
      ]);
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue(null);
      asMock(prisma, 'groupMember.create').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      const { service } = make(prisma);
      const result = await service.join('u2', 'g1', { token: invite.code });
      expect(result).toEqual({ groupId: 'g1', role: 'CONTRIBUTOR' });
    });

    it('rejects an invalid token', async () => {
      const prisma = buildPrisma();
      const invite = createGroupInvite('CONTRIBUTOR');
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PRIVATE',
      });
      asMock(prisma, 'groupInvite.findMany').mockResolvedValue([
        {
          codeHash: invite.codeHash,
          status: 'ACTIVE',
          role: 'CONTRIBUTOR',
          expiresAt: null,
        },
      ]);
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() => service.join('u2', 'g1', { token: 'wrong' })),
      ).toBe('INVALID_INVITE');
    });

    it('rejects joining when already a member (valid token)', async () => {
      const prisma = buildPrisma();
      const invite = createGroupInvite('CONTRIBUTOR');
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PRIVATE',
      });
      asMock(prisma, 'groupInvite.findMany').mockResolvedValue([
        {
          codeHash: invite.codeHash,
          status: 'ACTIVE',
          role: 'CONTRIBUTOR',
          expiresAt: null,
        },
      ]);
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        userId: 'u2',
        role: 'VIEWER',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() => service.join('u2', 'g1', { token: invite.code })),
      ).toBe('ALREADY_MEMBER');
    });
  });

  describe('leave', () => {
    it('blocks the last admin from leaving', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN' },
      ]);
      const { service } = make(prisma);
      expect(await codeOf(() => service.leave('u1', 'g1'))).toBe('LAST_ADMIN');
    });

    it('lets a contributor leave', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN' },
        { userId: 'u2', role: 'CONTRIBUTOR' },
      ]);
      asMock(prisma, 'groupMember.deleteMany').mockResolvedValue({ count: 1 });
      const { service } = make(prisma);
      expect(await service.leave('u2', 'g1')).toEqual({ left: true });
    });
  });

  describe('setRole', () => {
    it('lets an admin promote a member', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        userId: 'u1',
        role: 'ADMIN',
      });
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN' },
        { userId: 'u2', role: 'CONTRIBUTOR' },
      ]);
      asMock(prisma, 'groupMember.updateMany').mockResolvedValue({ count: 1 });
      const { service } = make(prisma);
      const result = await service.setRole('u1', 'g1', 'u2', { role: 'ADMIN' });
      expect(result).toEqual({ userId: 'u2', role: 'ADMIN' });
    });

    it('refuses a non-admin actor', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        userId: 'u2',
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN' },
        { userId: 'u2', role: 'CONTRIBUTOR' },
      ]);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.setRole('u2', 'g1', 'u1', { role: 'VIEWER' }),
        ),
      ).toBe('FORBIDDEN');
    });

    it('blocks demoting the last admin (409)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        userId: 'u1',
        role: 'ADMIN',
      });
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN' },
        { userId: 'u2', role: 'CONTRIBUTOR' },
      ]);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.setRole('u1', 'g1', 'u1', { role: 'VIEWER' }),
        ),
      ).toBe('LAST_ADMIN');
    });
  });

  describe('addCampaign', () => {
    it('rejects a non-cohort group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.addCampaign('u1', 'g1', { campaignId: 'c1' }),
        ),
      ).toBe('NOT_A_COHORT');
    });

    it('links an owned campaign to a cohort', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'campaign.findUnique').mockResolvedValue({
        studentProfile: { userId: 'u1' },
      });
      asMock(prisma, 'groupCampaign.findUnique').mockResolvedValue(null);
      asMock(prisma, 'groupCampaign.create').mockResolvedValue({});
      const { service } = make(prisma);
      const result = await service.addCampaign('u1', 'g1', {
        campaignId: 'c1',
      });
      expect(result).toEqual({ groupId: 'g1', campaignId: 'c1' });
    });

    it('rejects a foreign campaign', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'campaign.findUnique').mockResolvedValue({
        studentProfile: { userId: 'someone_else' },
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.addCampaign('u1', 'g1', { campaignId: 'c1' }),
        ),
      ).toBe('FORBIDDEN');
    });

    it('rejects a campaign already linked (409)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'campaign.findUnique').mockResolvedValue({
        studentProfile: { userId: 'u1' },
      });
      asMock(prisma, 'groupCampaign.findUnique').mockResolvedValue({
        id: 'gc1',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.addCampaign('u1', 'g1', { campaignId: 'c1' }),
        ),
      ).toBe('ALREADY_LINKED');
    });

    it('rejects an unknown campaign (404)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'campaign.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.addCampaign('u1', 'g1', { campaignId: 'ghost' }),
        ),
      ).toBe('NOT_FOUND');
    });
  });

  describe('contribute', () => {
    it('mirrors an owned donation into a circle', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'donation.findUnique').mockResolvedValue({
        id: 'd1',
        donorUserId: 'u1',
        amountCents: 5000,
      });
      asMock(prisma, 'groupContribution.findUnique').mockResolvedValue(null);
      asMock(prisma, 'groupContribution.create').mockResolvedValue({});
      const { service } = make(prisma);
      const result = await service.contribute('u1', 'g1', { donationId: 'd1' });
      expect(result).toEqual({
        groupId: 'g1',
        donationId: 'd1',
        valueCents: 5000,
      });
    });

    it('rejects a foreign donation', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'donation.findUnique').mockResolvedValue({
        id: 'd1',
        donorUserId: 'other',
        amountCents: 5000,
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.contribute('u1', 'g1', { donationId: 'd1' }),
        ),
      ).toBe('FORBIDDEN');
    });

    it('rejects a non-circle group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.contribute('u1', 'g1', { donationId: 'd1' }),
        ),
      ).toBe('NOT_A_CIRCLE');
    });

    it('rejects an unknown donation (404)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'donation.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.contribute('u1', 'g1', { donationId: 'ghost' }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('rejects a donation already contributed (409)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'donation.findUnique').mockResolvedValue({
        id: 'd1',
        donorUserId: 'u1',
        amountCents: 5000,
      });
      asMock(prisma, 'groupContribution.findUnique').mockResolvedValue({
        id: 'gc1',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.contribute('u1', 'g1', { donationId: 'd1' }),
        ),
      ).toBe('ALREADY_LINKED');
    });
  });

  describe('voting', () => {
    it('rejects a second ballot from the same member', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupVote.findFirst').mockResolvedValue({
        id: 'v1',
        status: 'OPEN',
        options: [{ id: 'o1' }],
      });
      asMock(prisma, 'groupVoteBallot.findUnique').mockResolvedValue({
        id: 'b1',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.castBallot('u1', 'g1', 'v1', { optionId: 'o1' }),
        ),
      ).toBe('ALREADY_VOTED');
    });

    it('rejects a ballot on a closed vote', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupVote.findFirst').mockResolvedValue({
        id: 'v1',
        status: 'CLOSED',
        options: [{ id: 'o1' }],
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.castBallot('u1', 'g1', 'v1', { optionId: 'o1' }),
        ),
      ).toBe('VOTE_CLOSED');
    });

    it('tallies a vote on read', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PUBLIC',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue(null);
      asMock(prisma, 'groupVote.findFirst').mockResolvedValue({
        id: 'v1',
        question: 'Who next?',
        status: 'OPEN',
        options: [
          { id: 'o1', label: 'Amara', campaignId: 'c1' },
          { id: 'o2', label: 'Ben', campaignId: 'c2' },
        ],
        ballots: [{ optionId: 'o1' }, { optionId: 'o1' }, { optionId: 'o2' }],
      });
      const { service } = make(prisma);
      const result = await service.voteState('viewer', 'g1', 'v1');
      expect(result.winnerId).toBe('o1');
      expect(result.totalVotes).toBe(3);
      expect(result.options.find((o) => o.id === 'o1')?.count).toBe(2);
    });
  });

  describe('postMessage', () => {
    it('approves a clean message', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupMessage.create').mockResolvedValue({
        id: 'm1',
        status: 'APPROVED',
      });
      const { service } = make(prisma);
      const result = await service.postMessage('u1', 'g1', {
        text: 'Nice work team',
      });
      expect(result.status).toBe('APPROVED');
      expect(result.reasons).toEqual([]);
    });

    it('rejects a message with a slur and stores the reason', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupMessage.create').mockResolvedValue({
        id: 'm2',
        status: 'REJECTED',
      });
      const { service } = make(prisma);
      const result = await service.postMessage('u1', 'g1', {
        text: 'you idiot',
      });
      expect(result.status).toBe('REJECTED');
      expect(result.reasons).toContain('slur:idiot');
      expect(asMock(prisma, 'groupMessage.create')).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            moderationReason: 'slur:idiot',
          }),
        }),
      );
    });
  });

  describe('matchCohort', () => {
    it('splits the total across live sub-campaigns and sponsors each via E5', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupCampaign.findMany').mockResolvedValue([
        {
          campaignId: 'c1',
          campaign: {
            id: 'c1',
            goalCents: 1_000_000,
            raisedCents: 700_000,
            status: 'LIVE',
          },
        },
        {
          campaignId: 'c2',
          campaign: {
            id: 'c2',
            goalCents: 1_000_000,
            raisedCents: 700_000,
            status: 'LIVE',
          },
        },
      ]);
      const { service, corporate } = make(prisma);
      const result = await service.matchCohort('sponsor', 'g1', {
        totalCents: 600_000,
        method: 'SEPA',
      } as never);
      expect(result.totalCents).toBe(600_000);
      expect(result.sponsored).toHaveLength(2);
      expect(
        (corporate as unknown as { sponsor: jest.Mock }).sponsor,
      ).toHaveBeenCalledTimes(2);
      expect(
        (corporate as unknown as { sponsor: jest.Mock }).sponsor,
      ).toHaveBeenCalledWith(
        'c1',
        'sponsor',
        expect.objectContaining({
          tier: 'CUSTOM',
          amountCents: 300_000,
          method: 'SEPA',
        }),
      );
    });

    it('rejects a match on a non-cohort group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.matchCohort('sponsor', 'g1', {
            totalCents: 600_000,
            method: 'SEPA',
          } as never),
        ),
      ).toBe('NOT_A_COHORT');
    });

    it('rejects a match with no live sub-campaigns', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupCampaign.findMany').mockResolvedValue([
        {
          campaignId: 'c1',
          campaign: {
            id: 'c1',
            goalCents: 1_000_000,
            raisedCents: 0,
            status: 'FUNDED',
          },
        },
      ]);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.matchCohort('sponsor', 'g1', {
            totalCents: 600_000,
            method: 'SEPA',
          } as never),
        ),
      ).toBe('NO_SUBCAMPAIGNS');
    });
  });

  describe('list', () => {
    it('returns my groups plus public groups, de-duplicated', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findMany')
        .mockResolvedValueOnce([
          {
            id: 'g1',
            mode: 'GIVING_CIRCLE',
            name: 'Mine',
            visibility: 'PUBLIC',
            _count: { members: 3 },
            members: [{ role: 'ADMIN' }],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'g1',
            mode: 'GIVING_CIRCLE',
            name: 'Mine',
            visibility: 'PUBLIC',
            _count: { members: 3 },
          },
          {
            id: 'g2',
            mode: 'COHORT',
            name: 'Other',
            visibility: 'PUBLIC',
            _count: { members: 2 },
          },
        ]);
      const { service } = make(prisma);
      const result = await service.list('u1');
      expect(result.mine).toHaveLength(1);
      expect(result.mine[0].role).toBe('ADMIN');
      // g1 is mine → filtered out of public; only g2 remains public
      expect(result.public.map((g) => g.id)).toEqual(['g2']);
    });
  });

  describe('invite', () => {
    it('creates a hash-only invite and returns a link (ADMIN only)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupInvite.create').mockResolvedValue({});
      const { service } = make(prisma);
      const result = await service.invite('u1', 'g1', {
        role: 'CONTRIBUTOR',
        expiresInDays: 14,
      });
      expect(result.link).toContain('/groups/g1/join?token=');
      expect(result.role).toBe('CONTRIBUTOR');
      expect(result.expiresAt).toBeInstanceOf(Date);
      // persisted row carries only the hash, never the raw token
      const createArg = asMock(prisma, 'groupInvite.create').mock.calls[0][0];
      expect(createArg.data.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(createArg)).not.toContain(
        result.link.split('token=')[1],
      );
    });

    it('refuses a non-admin', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      const { service } = make(prisma);
      expect(await codeOf(() => service.invite('u1', 'g1', {}))).toBe(
        'FORBIDDEN',
      );
    });
  });

  describe('openVote / closeVote', () => {
    it('opens a vote with options (ADMIN only)', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupVote.create').mockResolvedValue({
        id: 'v1',
        status: 'OPEN',
      });
      const { service } = make(prisma);
      const result = await service.openVote('u1', 'g1', {
        question: 'Who next?',
        options: [
          { campaignId: 'c1', label: 'Amara' },
          { campaignId: 'c2', label: 'Ben' },
        ],
      });
      expect(result).toEqual({ id: 'v1', status: 'OPEN' });
    });

    it('closes a vote and reports the winner', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupVote.findFirst').mockResolvedValue({
        id: 'v1',
        options: [{ id: 'o1' }, { id: 'o2' }],
        ballots: [{ optionId: 'o1' }, { optionId: 'o1' }],
      });
      asMock(prisma, 'groupVote.update').mockResolvedValue({});
      const { service } = make(prisma);
      const result = await service.closeVote('u1', 'g1', 'v1');
      expect(result).toEqual({ id: 'v1', status: 'CLOSED', winnerId: 'o1' });
    });
  });

  describe('analytics + messages', () => {
    it('builds analytics for a member', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PUBLIC',
        sharedGoalCents: 1_000_000,
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupContribution.findMany').mockResolvedValue([
        {
          userId: 'u1',
          valueCents: 500_000,
          createdAt: new Date('2026-06-01'),
          donation: { campaignId: 'c1', campaign: { title: 'Amara' } },
        },
      ]);
      asMock(prisma, 'groupMember.count').mockResolvedValue(4);
      const { service } = make(prisma);
      const result = await service.analytics(
        'u1',
        'g1',
        new Date('2026-06-25T00:00:00Z'),
      );
      expect(result.totalCents).toBe(500_000);
      expect(result.memberCount).toBe(4);
      expect(result.goalPercent).toBe(50);
    });

    it('returns only approved chat messages', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PUBLIC',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'VIEWER',
      });
      asMock(prisma, 'groupMessage.findMany').mockResolvedValue([
        {
          userId: 'u1',
          text: 'Hi team',
          createdAt: new Date('2026-06-01'),
          user: { displayName: 'Amara' },
        },
      ]);
      const { service } = make(prisma);
      const result = await service.messages('u1', 'g1');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].name).toBe('Amara');
      // only APPROVED messages are queried
      expect(asMock(prisma, 'groupMessage.findMany')).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: 'g1', status: 'APPROVED' },
        }),
      );
    });

    it('blocks a non-member on a private group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        visibility: 'PRIVATE',
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.messages('stranger', 'g1'))).toBe(
        'FORBIDDEN',
      );
    });
  });

  describe('get (circle branch)', () => {
    it('assembles a circle detail view with contributions and a leaderboard', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'GIVING_CIRCLE',
        visibility: 'PRIVATE',
        name: 'Circle',
        description: 'desc',
        logoUrl: null,
        sharedGoalCents: 1_000_000,
        stretchThresholdPct: 80,
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'CONTRIBUTOR',
      });
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN', user: { displayName: 'Amara' } },
        { userId: 'u2', role: 'CONTRIBUTOR', user: { displayName: 'Ben' } },
      ]);
      asMock(prisma, 'groupContribution.findMany').mockResolvedValue([
        {
          userId: 'u1',
          valueCents: 300_000,
          createdAt: new Date('2026-06-01'),
          donation: { campaignId: 'c1', campaign: { title: 'Amara' } },
        },
      ]);
      asMock(prisma, 'groupContribution.groupBy').mockResolvedValue([
        { userId: 'u1', _sum: { valueCents: 300_000 } },
      ]);
      const { service } = make(prisma);
      const view = await service.get(
        'u1',
        'g1',
        new Date('2026-06-25T00:00:00Z'),
      );
      expect(view).toHaveProperty('contributions');
      expect(view.sharedGoal.raisedCents).toBe(300_000);
      expect(view.leaderboard[0].id).toBe('u1');
    });

    it('blocks a non-member on a private group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
        visibility: 'PRIVATE',
        sharedGoalCents: 0,
        stretchThresholdPct: 80,
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.get('stranger', 'g1'))).toBe(
        'FORBIDDEN',
      );
    });
  });

  describe('loadGroup / not found', () => {
    it('throws NOT_FOUND for an unknown group', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.get('u1', 'ghost'))).toBe('NOT_FOUND');
    });
  });

  describe('get', () => {
    it('assembles a cohort detail view with shared goal, stretch and leaderboard', async () => {
      const prisma = buildPrisma();
      asMock(prisma, 'group.findUnique').mockResolvedValue({
        id: 'g1',
        mode: 'COHORT',
        visibility: 'PUBLIC',
        name: 'Cohort',
        description: null,
        logoUrl: null,
        sharedGoalCents: 3_000_000,
        stretchThresholdPct: 80,
      });
      asMock(prisma, 'groupMember.findUnique').mockResolvedValue({
        role: 'ADMIN',
      });
      asMock(prisma, 'groupMember.findMany').mockResolvedValue([
        { userId: 'u1', role: 'ADMIN', user: { displayName: 'Amara' } },
      ]);
      asMock(prisma, 'groupCampaign.findMany').mockResolvedValue([
        {
          campaignId: 'c1',
          campaign: {
            id: 'c1',
            title: "Amara's MBA",
            raisedCents: 2_500_000,
            goalCents: 1_500_000,
          },
        },
      ]);
      asMock(prisma, 'groupContribution.findMany').mockResolvedValue([]);
      asMock(prisma, 'groupContribution.groupBy').mockResolvedValue([]);
      const { service } = make(prisma);
      const view = await service.get(
        'u1',
        'g1',
        new Date('2026-06-25T00:00:00Z'),
      );
      expect(view.sharedGoal.raisedCents).toBe(2_500_000);
      expect(view.stretch.unlocked).toBe(true);
      expect(view.role).toBe('ADMIN');
      expect(view).toHaveProperty('subCampaigns');
    });
  });
});
