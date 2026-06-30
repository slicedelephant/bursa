import { SchoolOnboardingService } from './school-onboarding.service';
import { MockEsignatureProvider } from './mock-e-signature.provider';
import { createOnboardingToken } from './onboarding-token';

const fullPayoutDto = {
  bankAccountName: 'ESMT Berlin gGmbH',
  iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX',
  taxId: 'DE123456789',
  contactName: 'Jane Bursar',
  contactEmail: 'bursar@esmt.test',
};

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const school = {
    findUnique: jest.fn(),
    update: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 's1', name: 'ESMT', ...data }),
      ),
  };
  const schoolOnboardingToken = {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  };
  const prisma = {
    school,
    schoolOnboardingToken,
    $transaction: jest.fn().mockImplementation(async (cb) =>
      cb({
        schoolOnboardingToken,
        school: {
          update: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: 's1', name: 'ESMT', ...data }),
            ),
        },
      }),
    ),
    ...overrides,
  };
  return prisma;
}

function makeService(prisma: ReturnType<typeof buildPrisma>) {
  const esign = new MockEsignatureProvider(
    () => new Date('2026-06-29T10:00:00.000Z'),
  );
  return new SchoolOnboardingService(prisma as never, esign);
}

describe('SchoolOnboardingService', () => {
  it('saves payout data and advances NOT_STARTED to IN_PROGRESS', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'ESMT',
      onboardingStatus: 'NOT_STARTED',
      bic: null,
    });
    const updated = await makeService(prisma).savePayout('s1', fullPayoutDto);
    expect(updated.onboardingStatus).toBe('IN_PROGRESS');
    expect(prisma.school.update).toHaveBeenCalled();
  });

  it('keeps the status (and existing BIC) when payout is re-saved after activation', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'ESMT',
      onboardingStatus: 'ACTIVE',
      bic: 'EXISTINGBIC',
    });
    const updated = await makeService(prisma).savePayout('s1', {
      ...fullPayoutDto,
      bic: undefined,
    });
    expect(updated.onboardingStatus).toBe('ACTIVE');
    expect(updated.bic).toBe('EXISTINGBIC');
  });

  it('rejects an expired token', async () => {
    const created = createOnboardingToken({
      now: new Date('2020-01-01T00:00:00.000Z'),
      ttlMs: 1000,
    });
    const prisma = buildPrisma();
    prisma.schoolOnboardingToken.findUnique.mockResolvedValue({
      id: 't1',
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt,
      usedAt: null,
      school: { id: 's1', name: 'ESMT' },
    });
    await expect(
      makeService(prisma).getOnboardingByToken(created.token),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_TOKEN' },
    });
  });

  it('completes onboarding without a BIC', async () => {
    const created = createOnboardingToken();
    const prisma = buildPrisma();
    prisma.schoolOnboardingToken.findUnique.mockResolvedValue({
      id: 't1',
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt,
      usedAt: null,
      school: { id: 's1', name: 'ESMT' },
    });
    const result = await makeService(prisma).completeViaToken(created.token, {
      ...fullPayoutDto,
      bic: undefined,
      signerName: 'Jane Bursar',
    });
    expect(result.onboardingStatus).toBe('ACTIVE');
  });

  it('throws when the school does not exist', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue(null);
    await expect(
      makeService(prisma).savePayout('missing', fullPayoutDto),
    ).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' },
    });
  });

  it('blocks signing when payout data is incomplete', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'ESMT',
      onboardingStatus: 'IN_PROGRESS',
    });
    await expect(
      makeService(prisma).signAgreement('s1', { signerName: 'Jane' }),
    ).rejects.toMatchObject({
      response: { code: 'PAYOUT_INCOMPLETE' },
    });
  });

  it('signs the agreement, activates the school and verifies payout', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({
      id: 's1',
      name: 'ESMT',
      onboardingStatus: 'IN_PROGRESS',
      ...fullPayoutDto,
    });
    const updated = await makeService(prisma).signAgreement('s1', {
      signerName: 'Jane Bursar',
    });
    expect(updated.onboardingStatus).toBe('ACTIVE');
    expect(updated.payoutVerified).toBe(true);
    expect(updated.agreementRef).toMatch(/^mock_esign_/);
  });

  it('generates a one-time onboarding link', async () => {
    const prisma = buildPrisma();
    prisma.school.findUnique.mockResolvedValue({ id: 's1', name: 'ESMT' });
    const link = await makeService(prisma).generateLink('s1', 24);
    expect(link.path).toBe(`/school/onboarding/${link.token}`);
    expect(prisma.schoolOnboardingToken.create).toHaveBeenCalled();
    expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('reads onboarding state from a valid token and rejects an invalid one', async () => {
    const created = createOnboardingToken();
    const prisma = buildPrisma();
    prisma.schoolOnboardingToken.findUnique.mockResolvedValue({
      id: 't1',
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt,
      usedAt: null,
      school: {
        id: 's1',
        name: 'ESMT',
        country: 'Germany',
        onboardingStatus: 'NOT_STARTED',
      },
    });
    const state = await makeService(prisma).getOnboardingByToken(created.token);
    expect(state.schoolName).toBe('ESMT');

    prisma.schoolOnboardingToken.findUnique.mockResolvedValue(null);
    await expect(
      makeService(prisma).getOnboardingByToken('bogus'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_TOKEN' },
    });
  });

  it('completes onboarding via token, consuming it', async () => {
    const created = createOnboardingToken();
    const prisma = buildPrisma();
    prisma.schoolOnboardingToken.findUnique.mockResolvedValue({
      id: 't1',
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt,
      usedAt: null,
      school: { id: 's1', name: 'ESMT' },
    });
    const result = await makeService(prisma).completeViaToken(created.token, {
      ...fullPayoutDto,
      signerName: 'Jane Bursar',
    });
    expect(result.onboardingStatus).toBe('ACTIVE');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
