import { SchoolPortalService } from './school-portal.service';

function buildPrisma() {
  return {
    schoolAdmin: { findUnique: jest.fn().mockResolvedValue({ userId: 'u1', schoolId: 's1' }) },
    school: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        name: 'ESMT Berlin',
        country: 'Germany',
        onboardingStatus: 'ACTIVE',
        payoutVerified: true,
        iban: 'DE89370400440532013000',
        bankAccountName: 'ESMT',
        taxId: 'DE123',
        contactName: 'Jane',
        contactEmail: 'jane@esmt.test',
        agreementSignedAt: new Date(),
      }),
    },
    campaign: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'c1',
          title: 'MBA tuition',
          status: 'FUNDED',
          goalCents: 100_000,
          raisedCents: 100_000,
          studentProfile: { fullName: 'Amara' },
          payout: null,
        },
      ]),
    },
    donation: {
      findMany: jest.fn().mockResolvedValue([{ amountCents: 50_000, donorCountry: 'Germany' }]),
    },
  };
}

describe('SchoolPortalService', () => {
  it('resolves the linked school for a school-admin', async () => {
    const prisma = buildPrisma();
    const service = new SchoolPortalService(prisma as never);
    expect(await service.resolveSchoolId('u1')).toBe('s1');
  });

  it('forbids a user with no school link', async () => {
    const prisma = buildPrisma();
    prisma.schoolAdmin.findUnique.mockResolvedValue(null);
    const service = new SchoolPortalService(prisma as never);
    await expect(service.resolveSchoolId('nobody')).rejects.toMatchObject({
      response: { code: 'FORBIDDEN' },
    });
  });

  it('returns the masked profile + onboarding state', async () => {
    const prisma = buildPrisma();
    const service = new SchoolPortalService(prisma as never);
    const me = await service.getMySchool('u1');
    expect(me.school.name).toBe('ESMT Berlin');
    expect(me.school.ibanMasked).toBe('•••• 3000');
    expect(me.onboarding.progressPct).toBe(100);
  });

  it('throws when the linked school no longer exists', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue(null);
    const service = new SchoolPortalService(prisma as never);
    await expect(service.getMySchool('u1')).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });

  it('handles a missing student profile, a payout row and a short IBAN', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'X',
      country: 'DE',
      onboardingStatus: 'IN_PROGRESS',
      payoutVerified: false,
      iban: 'DE12',
    });
    prisma.campaign.findMany.mockResolvedValue([
      { id: 'c1', title: 't', status: 'DISBURSED', goalCents: 100, raisedCents: 100, studentProfile: null, payout: { status: 'SENT' } },
    ]);
    prisma.donation.findMany.mockResolvedValue([{ amountCents: 10, donorCountry: null }]);
    const service = new SchoolPortalService(prisma as never);

    const me = await service.getMySchool('u1');
    expect(me.school.ibanMasked).toBe('••••');

    const dashboard = await service.dashboard('u1');
    expect(dashboard.students[0].studentName).toBe('Unknown');
    expect(dashboard.students[0].payoutStatus).toBe('SENT');
    expect(dashboard.donorGeography[0].country).toBe('Unknown');
  });

  it('returns a null masked IBAN when none is stored', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'X',
      country: 'DE',
      onboardingStatus: 'NOT_STARTED',
      payoutVerified: false,
      iban: null,
    });
    const service = new SchoolPortalService(prisma as never);
    expect((await service.getMySchool('u1')).school.ibanMasked).toBeNull();
  });

  it('builds the dashboard from the school campaigns + donations', async () => {
    const prisma = buildPrisma();
    const service = new SchoolPortalService(prisma as never);
    const dashboard = await service.dashboard('u1');
    expect(dashboard.totals.totalStudents).toBe(1);
    expect(dashboard.totals.fundedCampaigns).toBe(1);
    expect(dashboard.donorGeography[0]).toEqual({ country: 'Germany', donationCount: 1, amountCents: 50_000 });
  });
});
