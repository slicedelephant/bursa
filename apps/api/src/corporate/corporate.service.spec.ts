import { CorporateService } from './corporate.service';
import { SponsorDto } from './dto/sponsor.dto';

async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

const campaign = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  status: 'LIVE',
  currency: 'EUR',
  goalCents: 100_000,
  raisedCents: 40_000,
  tipsCents: 0,
  verification: { status: 'VERIFIED' },
  studentProfile: { fullName: 'Amara Okonkwo' },
  ...over,
});

function buildTx() {
  return {
    donation: {
      create: jest.fn(({ data }) => ({
        id: 'd1',
        createdAt: new Date('2026-06-01'),
        ...data,
      })),
    },
    corporateSponsorship: {
      create: jest.fn(({ data }) => ({ id: 'sp1', ...data })),
    },
    invoice: {
      create: jest.fn(({ data }) => ({ id: 'inv1', ...data })),
    },
    campaign: {
      update: jest.fn(({ data }) => ({
        id: 'c1',
        status: data.status ?? 'LIVE',
        goalCents: 100_000,
        currency: 'EUR',
        raisedCents: data.raisedCents,
        tipsCents: data.tipsCents,
      })),
    },
  };
}

function buildPrisma(tx = buildTx()) {
  return {
    tx,
    campaign: { findUnique: jest.fn().mockResolvedValue(campaign()) },
    corporateProfile: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'corp1',
          userId: 'u1',
          companyName: 'Acme Capital',
        }),
    },
    corporateSponsorship: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    invoice: { update: jest.fn() },
    $transaction: jest.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
  };
}

function buildDeps(prisma = buildPrisma()) {
  const payments = {
    chargeImmediately: jest
      .fn()
      .mockResolvedValue({ status: 'SUCCEEDED', reference: 'mock_charge_1' }),
    createSepaPledge: jest
      .fn()
      .mockResolvedValue({ status: 'SUCCEEDED', reference: 'mock_sepa_1' }),
  };
  const donations = {
    captureCampaign: jest
      .fn()
      .mockResolvedValue({
        capturedIds: ['x'],
        failedIds: [],
        capturedCents: 12_000,
      }),
  };
  const notifications = {
    deliver: jest.fn(),
    subscribe: jest.fn(),
    onDonation: jest.fn(),
  };
  const svc = new CorporateService(
    prisma as never,
    payments as never,
    donations as never,
    notifications as never,
  );
  return { svc, prisma, payments, donations, notifications };
}

const dto = (over: Partial<SponsorDto> = {}): SponsorDto =>
  ({
    tier: 'FULL',
    method: 'CARD',
    ...over,
  }) as SponsorDto;

describe('CorporateService.sponsor', () => {
  it('full-tuition card closes the gap, funds the campaign, captures donor pledges', async () => {
    const { svc, prisma, payments, donations } = buildDeps();
    const res = await svc.sponsor(
      'c1',
      'u1',
      dto({ tier: 'FULL', method: 'CARD' }),
    );

    expect(payments.chargeImmediately).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 60_000, method: 'CARD' }),
    );
    expect(res.campaign.status).toBe('FUNDED');
    expect(res.campaign.percent).toBe(100);
    expect(res.sponsorship.fullTuition).toBe(true);
    expect(res.invoice.status).toBe('PAID');
    expect(donations.captureCampaign).toHaveBeenCalledWith('c1');
    expect(res.capture).toEqual({
      capturedIds: ['x'],
      failedIds: [],
      capturedCents: 12_000,
    });
    // donation net = remaining gap (60_000)
    expect(prisma.tx.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 60_000,
          type: 'CORPORATE',
          status: 'SUCCEEDED',
        }),
      }),
    );
  });

  it('logo recognition => SPONSORING invoice with 19% VAT and NAMED/LOGO kind', async () => {
    const { svc, prisma } = buildDeps();
    await svc.sponsor(
      'c1',
      'u1',
      dto({
        tier: 'FULL',
        method: 'CARD',
        logoRecognition: true,
        scholarshipName: 'The Acme Scholarship',
      }),
    );
    const invoiceData = prisma.tx.invoice.create.mock.calls[0][0].data;
    expect(invoiceData.documentType).toBe('SPONSORING');
    expect(invoiceData.netCents).toBe(60_000);
    expect(invoiceData.vatCents).toBe(11_400); // 19%
    expect(invoiceData.grossCents).toBe(71_400);
    const spData = prisma.tx.corporateSponsorship.create.mock.calls[0][0].data;
    expect(spData.recognitionKind).toBe('NAMED');
    expect(spData.logoRecognition).toBe(true);
  });

  it('no recognition => DONATION receipt without VAT and an anonymous donation', async () => {
    const { svc, prisma } = buildDeps();
    await svc.sponsor('c1', 'u1', dto());
    const invoiceData = prisma.tx.invoice.create.mock.calls[0][0].data;
    expect(invoiceData.documentType).toBe('DONATION');
    expect(invoiceData.vatCents).toBe(0);
    expect(
      prisma.tx.corporateSponsorship.create.mock.calls[0][0].data
        .recognitionKind,
    ).toBe('ANONYMOUS');
    expect(prisma.tx.donation.create.mock.calls[0][0].data.anonymous).toBe(
      true,
    );
  });

  it('SEPA partial sponsorship stays unfunded with a PENDING invoice and no capture', async () => {
    const prisma = buildPrisma();
    const { svc, payments, donations } = buildDeps(prisma);
    const res = await svc.sponsor(
      'c1',
      'u1',
      dto({ tier: 'SEMESTER', method: 'SEPA' }),
    );
    expect(payments.createSepaPledge).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 25_000, method: 'SEPA' }),
    );
    expect(res.campaign.status).toBe('LIVE');
    expect(res.invoice.status).toBe('PENDING');
    expect(donations.captureCampaign).not.toHaveBeenCalled();
    expect(res.capture).toBeUndefined();
  });

  it('resolves a CUSTOM amount and rejects a non-positive one', async () => {
    const { svc, payments } = buildDeps();
    await svc.sponsor(
      'c1',
      'u1',
      dto({ tier: 'CUSTOM', amountCents: 5_000, method: 'CARD' }),
    );
    expect(payments.chargeImmediately).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 5_000 }),
    );
    const code = await codeOf(() =>
      buildDeps().svc.sponsor(
        'c1',
        'u1',
        dto({ tier: 'CUSTOM', method: 'CARD' }),
      ),
    );
    expect(code).toBe('VALIDATION_ERROR');
  });

  it('subscribes the sponsor when impact-report opt-in is set', async () => {
    const { svc, notifications } = buildDeps();
    await svc.sponsor('c1', 'u1', dto({ impactReportOptIn: true }));
    expect(notifications.subscribe).toHaveBeenCalledWith('u1', 'c1');
    expect(notifications.deliver).toHaveBeenCalled();
  });

  it('rejects a failed payment with 402', async () => {
    const { svc, payments } = buildDeps();
    payments.chargeImmediately.mockResolvedValue({
      status: 'FAILED',
      reference: 'x',
      failureReason: 'declined',
    });
    expect(await codeOf(() => svc.sponsor('c1', 'u1', dto()))).toBe(
      'PAYMENT_FAILED',
    );
  });

  it('requires a corporate profile', async () => {
    const prisma = buildPrisma();
    prisma.corporateProfile.findUnique.mockResolvedValue(null);
    const { svc } = buildDeps(prisma);
    expect(await codeOf(() => svc.sponsor('c1', 'u1', dto()))).toBe(
      'VALIDATION_ERROR',
    );
  });

  it('rejects a campaign that is not live/verified', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(
      campaign({ status: 'DRAFT', verification: { status: 'PENDING' } }),
    );
    const { svc } = buildDeps(prisma);
    expect(await codeOf(() => svc.sponsor('c1', 'u1', dto()))).toBe(
      'NOT_FOUND',
    );
  });

  it('rejects an already fully funded campaign', async () => {
    const prisma = buildPrisma();
    prisma.campaign.findUnique.mockResolvedValue(
      campaign({ raisedCents: 100_000 }),
    );
    const { svc } = buildDeps(prisma);
    expect(await codeOf(() => svc.sponsor('c1', 'u1', dto()))).toBe(
      'CAMPAIGN_FULLY_FUNDED',
    );
  });
});

describe('CorporateService ESG', () => {
  const sponsorshipRow = (over: Record<string, unknown> = {}) => ({
    tier: 'FULL',
    scholarshipName: 'The Acme Scholarship',
    fullTuition: true,
    recognitionKind: 'NAMED',
    createdAt: new Date('2026-06-01'),
    donation: { amountCents: 60_000 },
    campaign: {
      title: 'Help Amara',
      studentProfile: { fullName: 'Amara', country: 'Nigeria' },
      school: { name: 'INSEAD' },
    },
    ...over,
  });

  it('returns metrics + rows', async () => {
    const prisma = buildPrisma();
    prisma.corporateSponsorship.findMany.mockResolvedValue([sponsorshipRow()]);
    const { svc } = buildDeps(prisma);
    const res = await svc.esg('u1');
    expect(res.companyName).toBe('Acme Capital');
    expect(res.metrics.studentsSupported).toBe(1);
    expect(res.metrics.totalCommittedCents).toBe(60_000);
    expect(res.rows[0].studentName).toBe('Amara');
  });

  it('exports CSV and a PDF', async () => {
    const prisma = buildPrisma();
    prisma.corporateSponsorship.findMany.mockResolvedValue([sponsorshipRow()]);
    const { svc } = buildDeps(prisma);
    const csv = await svc.esgCsv('u1');
    expect(csv).toContain('Campaign,Student,Country,School');
    expect(csv).toContain('Amara');
    const pdf = await svc.esgPdf('u1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('Bursa ESG');
  });

  it('throws when the sponsor has no corporate profile', async () => {
    const prisma = buildPrisma();
    prisma.corporateProfile.findUnique.mockResolvedValue(null);
    const { svc } = buildDeps(prisma);
    expect(await codeOf(() => svc.esg('u1'))).toBe('NOT_FOUND');
  });
});

describe('CorporateService invoice + settle', () => {
  const owned = (over: Record<string, unknown> = {}) => ({
    id: 'sp1',
    corporateProfile: { userId: 'u1', companyName: 'Acme Capital' },
    campaign: { title: 'Help Amara', school: { name: 'INSEAD' } },
    invoice: {
      id: 'inv1',
      invoiceNo: 'BURSA-INV-2026-SP1',
      documentType: 'SPONSORING',
      netCents: 60_000,
      vatCents: 11_400,
      grossCents: 71_400,
      currency: 'EUR',
      vatId: 'DE123',
      poNumber: 'PO-1',
      status: 'PAID',
      settledAt: new Date(),
      issuedAt: new Date(),
    },
    ...over,
  });

  it('returns the invoice document for the owner', async () => {
    const prisma = buildPrisma();
    prisma.corporateSponsorship.findUnique.mockResolvedValue(owned());
    const { svc } = buildDeps(prisma);
    const doc = await svc.invoice('u1', 'sp1');
    expect(doc.invoiceNo).toBe('BURSA-INV-2026-SP1');
    expect(doc.companyName).toBe('Acme Capital');
    expect(doc.issuer).toContain('sponsoring invoice');
  });

  it('forbids a non-owner and 404s a missing sponsorship', async () => {
    const prisma = buildPrisma();
    prisma.corporateSponsorship.findUnique.mockResolvedValue(
      owned({ corporateProfile: { userId: 'other' } }),
    );
    expect(await codeOf(() => buildDeps(prisma).svc.invoice('u1', 'sp1'))).toBe(
      'FORBIDDEN',
    );

    const prisma2 = buildPrisma();
    prisma2.corporateSponsorship.findUnique.mockResolvedValue(null);
    expect(
      await codeOf(() => buildDeps(prisma2).svc.invoice('u1', 'sp1')),
    ).toBe('NOT_FOUND');
  });

  it('settles a pending SEPA invoice to PAID', async () => {
    const prisma = buildPrisma();
    const pending = owned({
      invoice: { ...owned().invoice, status: 'PENDING' },
    });
    const paid = owned({ invoice: { ...owned().invoice, status: 'PAID' } });
    prisma.corporateSponsorship.findUnique
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(paid);
    const { svc } = buildDeps(prisma);
    const doc = await svc.settle('u1', 'sp1');
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' }),
      }),
    );
    expect(doc.status).toBe('PAID');
  });

  it('rejects settling an already paid invoice', async () => {
    const prisma = buildPrisma();
    prisma.corporateSponsorship.findUnique.mockResolvedValue(owned());
    expect(await codeOf(() => buildDeps(prisma).svc.settle('u1', 'sp1'))).toBe(
      'CONFLICT',
    );
  });
});
