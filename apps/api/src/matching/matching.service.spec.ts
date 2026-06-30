import { DomainException } from '../common/domain.exception';
import { MatchProgram } from './employer-match-lookup';
import { MatchingService } from './matching.service';

const program: MatchProgram = {
  domain: 'sap.com',
  employerName: 'SAP',
  matchRatio: 100,
  annualCapCents: 500_000,
  minDonationCents: 1_000,
  integrationLevel: 'PORTAL',
  applyUrlTemplate: 'https://m.sap.example/apply?amount={amount}',
  active: true,
};

const manualProgram: MatchProgram = {
  ...program,
  domain: 'siemens.com',
  employerName: 'Siemens',
  integrationLevel: 'MANUAL',
  applyUrlTemplate: null,
};

const year = new Date().getFullYear();

function makeCampaign(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'camp_1',
    goalCents: 1_000_000,
    raisedCents: 100_000,
    status: 'LIVE',
    ...over,
  };
}

function makeService(
  provider: { lookupByDomain: jest.Mock },
  prisma: Record<string, unknown>,
) {
  return new MatchingService(prisma as never, provider as never);
}

describe('MatchingService', () => {
  describe('detect', () => {
    it('returns ineligible for an unknown domain', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(null) };
      const service = makeService(provider, { user: { update: jest.fn() } });
      const result = await service.detect('jane@example.org', 'en');
      expect(result.eligible).toBe(false);
    });

    it('returns an offer and persists the employer for a logged-in donor', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const update = jest.fn().mockResolvedValue({});
      const service = makeService(provider, { user: { update } });
      const result = await service.detect('jane@sap.com', 'de', 'donor_1');
      expect(result.eligible).toBe(true);
      expect(result.employerName).toBe('SAP');
      expect(update).toHaveBeenCalledWith({
        where: { id: 'donor_1' },
        data: { employerName: 'SAP', employerDomain: 'sap.com' },
      });
    });

    it('returns ineligible for an inactive program', async () => {
      const provider = {
        lookupByDomain: jest
          .fn()
          .mockResolvedValue({ ...program, active: false }),
      };
      const service = makeService(provider, { user: { update: jest.fn() } });
      expect((await service.detect('x@legacycorp.com', 'en')).eligible).toBe(
        false,
      );
    });

    it('returns ineligible for an email whose domain is not parseable', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const service = makeService(provider, { user: { update: jest.fn() } });
      // 'jane@localhost' has no dot → extractDomain returns null → no lookup.
      expect((await service.detect('jane@localhost', 'en')).eligible).toBe(
        false,
      );
      expect(provider.lookupByDomain).not.toHaveBeenCalled();
    });
  });

  describe('offer', () => {
    it('returns ineligible when the donor has no program', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(null) };
      const service = makeService(provider, {
        campaign: { findUnique: jest.fn().mockResolvedValue(makeCampaign()) },
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const result = await service.offer(
        'camp_1',
        10_000,
        'en',
        'jane@example.org',
      );
      expect(result.eligible).toBe(false);
    });

    it('computes a capped match', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const service = makeService(provider, {
        campaign: { findUnique: jest.fn().mockResolvedValue(makeCampaign()) },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            matchYear: year,
            matchUsedCents: 495_000,
          }),
        },
      });
      const result = await service.offer(
        'camp_1',
        10_000,
        'en',
        'jane@sap.com',
        'donor_1',
      );
      expect(result.eligible).toBe(true);
      expect(result.matchCents).toBe(5_000); // capped at remaining 5_000
      expect(result.capped).toBe(true);
    });

    it('throws when the campaign is missing', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const service = makeService(provider, {
        campaign: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.offer('nope', 10_000, 'en', 'jane@sap.com'),
      ).rejects.toThrow(DomainException);
    });

    it('uses the donor stored employerDomain when no workEmail is given', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const service = makeService(provider, {
        campaign: { findUnique: jest.fn().mockResolvedValue(makeCampaign()) },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            employerDomain: 'sap.com',
            matchYear: null,
            matchUsedCents: 0,
          }),
        },
      });
      const result = await service.offer(
        'camp_1',
        10_000,
        'fr',
        undefined,
        'donor_1',
      );
      expect(result.eligible).toBe(true);
      // lookup called with a bare domain (no '@'), exercising that branch.
      expect(provider.lookupByDomain).toHaveBeenCalledWith('sap.com');
      expect(result.matchCents).toBe(10_000);
    });

    it('returns ineligible when neither workEmail nor stored domain exist', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const service = makeService(provider, {
        campaign: { findUnique: jest.fn().mockResolvedValue(makeCampaign()) },
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'donor_1' }) },
      });
      const result = await service.offer(
        'camp_1',
        10_000,
        'en',
        undefined,
        'donor_1',
      );
      expect(result.eligible).toBe(false);
      expect(provider.lookupByDomain).not.toHaveBeenCalled();
    });
  });

  describe('claim', () => {
    const baseDonation = {
      id: 'don_1',
      campaignId: 'camp_1',
      donorUserId: 'donor_1',
      amountCents: 10_000,
      campaign: makeCampaign(),
    };

    function claimPrisma(over: Record<string, unknown> = {}) {
      const tx = {
        donation: {
          create: jest.fn().mockResolvedValue({ id: 'match_don_1' }),
        },
        campaign: { update: jest.fn().mockResolvedValue({}) },
        matchClaim: {
          create: jest.fn().mockResolvedValue({
            id: 'claim_1',
            status: 'CLAIMED',
            employerName: 'SAP',
            matchCents: 10_000,
            campaignId: 'camp_1',
            applyUrl: 'https://m.sap.example/apply?amount=100',
            pdfRef: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            matchYear: year,
            matchUsedCents: 0,
          }),
          update: jest.fn().mockResolvedValue({ matchUsedCents: 10_000 }),
        },
      };
      return {
        donation: { findUnique: jest.fn().mockResolvedValue(baseDonation) },
        matchClaim: { findUnique: jest.fn().mockResolvedValue(null) },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            matchYear: year,
            matchUsedCents: 0,
          }),
        },
        employerMatchProgram: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prog_1' }),
        },
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
        ...over,
      };
    }

    it('commits a match donation and returns the claim view', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = claimPrisma();
      const service = makeService(provider, prisma);
      const result = await service.claim(
        'don_1',
        'en',
        'jane@sap.com',
        'donor_1',
      );
      expect(result.id).toBe('claim_1');
      expect(result.status).toBe('CLAIMED');
      expect(result.matchCents).toBe(10_000);
      expect(result.remainingAnnualCents).toBe(490_000);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('is idempotent — rejects a second claim on the same donation', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = claimPrisma({
        matchClaim: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing' }),
        },
      });
      const service = makeService(provider, prisma);
      await expect(
        service.claim('don_1', 'en', 'jane@sap.com', 'donor_1'),
      ).rejects.toThrow(/already been matched/);
    });

    it('throws NOT_FOUND when the donation is missing', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const prisma = claimPrisma({
        donation: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = makeService(provider, prisma);
      await expect(service.claim('nope', 'en', 'jane@sap.com')).rejects.toThrow(
        DomainException,
      );
    });

    it('rejects when no match budget remains', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = claimPrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            matchYear: year,
            matchUsedCents: 500_000,
          }),
        },
      });
      const service = makeService(provider, prisma);
      await expect(
        service.claim('don_1', 'en', 'jane@sap.com', 'donor_1'),
      ).rejects.toThrow(/No match budget/);
    });

    it('rejects when the employer is not eligible', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(null) };
      const prisma = claimPrisma();
      const service = makeService(provider, prisma);
      await expect(
        service.claim('don_1', 'en', 'jane@example.org', 'donor_1'),
      ).rejects.toThrow(/No active employer match/);
    });

    it('rejects when the campaign is already fully funded', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = claimPrisma({
        donation: {
          findUnique: jest.fn().mockResolvedValue({
            ...baseDonation,
            campaign: makeCampaign({ raisedCents: 1_000_000 }),
          }),
        },
      });
      const service = makeService(provider, prisma);
      await expect(
        service.claim('don_1', 'en', 'jane@sap.com', 'donor_1'),
      ).rejects.toThrow(/already fully funded/);
    });

    it('rejects when the program row is not provisioned', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = claimPrisma({
        employerMatchProgram: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = makeService(provider, prisma);
      await expect(
        service.claim('don_1', 'en', 'jane@sap.com', 'donor_1'),
      ).rejects.toThrow(/not provisioned/);
    });

    it('falls back to the donation donor when no donorUserId is passed and marks FUNDED', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      // Campaign one match away from the goal so the FUNDED branch fires.
      const tx = {
        donation: {
          create: jest.fn().mockResolvedValue({ id: 'match_don_1' }),
        },
        campaign: { update: jest.fn().mockResolvedValue({}) },
        matchClaim: {
          create: jest.fn().mockResolvedValue({
            id: 'claim_1',
            status: 'CLAIMED',
            employerName: 'SAP',
            matchCents: 5_000,
            campaignId: 'camp_1',
            applyUrl: null,
            pdfRef: null,
          }),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            matchYear: year - 1,
            matchUsedCents: 999_999,
          }),
          update: jest.fn().mockResolvedValue({ matchUsedCents: 5_000 }),
        },
      };
      const prisma = {
        donation: {
          findUnique: jest.fn().mockResolvedValue({
            ...baseDonation,
            donorUserId: 'donor_1',
            amountCents: 5_000,
            campaign: makeCampaign({ raisedCents: 995_000, status: 'LIVE' }),
          }),
        },
        matchClaim: { findUnique: jest.fn().mockResolvedValue(null) },
        // year rolled → used resets to 0, full balance available
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            employerDomain: 'sap.com',
            matchYear: year - 1,
            matchUsedCents: 999_999,
          }),
        },
        employerMatchProgram: {
          findUnique: jest.fn().mockResolvedValue({ id: 'prog_1' }),
        },
        $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      };
      const service = makeService(provider, prisma);
      const result = await service.claim('don_1', 'en'); // no workEmail, no donorUserId
      expect(result.matchCents).toBe(5_000);
      // FUNDED branch: raised 995_000 + 5_000 == goal 1_000_000
      expect(tx.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FUNDED' }),
        }),
      );
    });
  });

  describe('balance', () => {
    it('returns the remaining balance and history', async () => {
      const provider = { lookupByDomain: jest.fn().mockResolvedValue(program) };
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            employerName: 'SAP',
            employerDomain: 'sap.com',
            matchYear: year,
            matchUsedCents: 200_000,
          }),
        },
        matchClaim: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'c1',
              employerName: 'SAP',
              matchCents: 200_000,
              status: 'CLAIMED',
              createdAt: new Date('2026-06-01T00:00:00Z'),
              campaign: { title: 'Amara', school: { name: 'ESMT' } },
            },
          ]),
        },
      };
      const service = makeService(provider, prisma);
      const result = await service.balance('donor_1');
      expect(result.remainingAnnualCents).toBe(300_000);
      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].schoolName).toBe('ESMT');
    });

    it('returns an empty balance for a donor with no employer', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'donor_1',
            employerName: null,
            employerDomain: null,
            matchYear: null,
            matchUsedCents: 0,
          }),
        },
        matchClaim: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const service = makeService(provider, prisma);
      const result = await service.balance('donor_1');
      expect(result.remainingAnnualCents).toBeUndefined();
      expect(result.claims).toHaveLength(0);
      expect(provider.lookupByDomain).not.toHaveBeenCalled();
    });

    it('throws when the user is missing', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const service = makeService(provider, {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.balance('nope')).rejects.toThrow(DomainException);
    });
  });

  describe('claimDocument', () => {
    it('renders the PDF for the owner', async () => {
      const provider = {
        lookupByDomain: jest.fn().mockResolvedValue(manualProgram),
      };
      const prisma = {
        matchClaim: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'claim_1',
            donorUserId: 'donor_1',
            employerName: 'Siemens',
            matchCents: 20_000,
            campaign: { title: 'Amara' },
          }),
        },
      };
      const service = makeService(provider, prisma);
      const pdf = await service.claimDocument('donor_1', 'claim_1');
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    });

    it('forbids access to another donor claim', async () => {
      const provider = { lookupByDomain: jest.fn() };
      const prisma = {
        matchClaim: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'claim_1',
            donorUserId: 'other',
            campaign: { title: 'x' },
          }),
        },
      };
      const service = makeService(provider, prisma);
      await expect(service.claimDocument('donor_1', 'claim_1')).rejects.toThrow(
        /Not your claim/,
      );
    });
  });
});
