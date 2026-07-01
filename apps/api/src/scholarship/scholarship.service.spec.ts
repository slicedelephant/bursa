import { MockMessagingProvider } from '../impact-feed/messaging/mock-messaging.provider';
import { ScholarshipService } from './scholarship.service';

/** Runs an action and returns the DomainException `code` it throws. */
async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

type AnyFn = jest.Mock;

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const tx = {
    application: { update: jest.fn(), create: jest.fn() },
    applicationForm: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    formField: { deleteMany: jest.fn(), createMany: jest.fn() },
    applicationAnswer: { deleteMany: jest.fn(), createMany: jest.fn() },
    scholarshipAward: { create: jest.fn() },
    scholarRelationship: { create: jest.fn() },
    reviewScore: { upsert: jest.fn() },
  };
  const prisma = {
    corporateProfile: { findUnique: jest.fn() },
    scholarshipProgram: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    programCycle: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    applicationForm: { findUnique: jest.fn() },
    programReviewer: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    application: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    applicationAnswer: { deleteMany: jest.fn(), createMany: jest.fn() },
    scholarshipAward: { findUnique: jest.fn(), update: jest.fn() },
    scholarRelationship: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    school: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    __tx: tx,
    ...overrides,
  };
  return prisma as never;
}

function buildLedger() {
  return { append: jest.fn(async () => ({ id: 'led_1' })) } as never;
}

function buildPayments() {
  return {
    createPayout: jest.fn(async () => ({ status: 'SENT', reference: 'mock_payout_1' })),
  } as never;
}

function make(prisma: ReturnType<typeof buildPrisma>) {
  const ledger = buildLedger();
  const payments = buildPayments();
  const messaging = new MockMessagingProvider();
  const service = new ScholarshipService(prisma, ledger, payments, messaging);
  return { service, ledger, payments, messaging };
}

function m(prisma: unknown, path: string): AnyFn {
  return path.split('.').reduce((o: never, k) => (o as never)[k], prisma as never);
}

const OWNER = { id: 'prof_1' };

function withOwner(prisma: ReturnType<typeof buildPrisma>) {
  m(prisma, 'corporateProfile.findUnique').mockResolvedValue({ id: OWNER.id });
}

describe('ScholarshipService', () => {
  describe('createProgram', () => {
    it('rejects a user without a corporate profile', async () => {
      const prisma = buildPrisma();
      m(prisma, 'corporateProfile.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.createProgram('u1', {} as never))).toBe(
        'NO_CORPORATE_PROFILE',
      );
    });

    it('rejects a taken slug', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({ id: 'p9' });
      const { service } = make(prisma);
      const dto = { slug: 'x', name: 'X', year: 2026, budgetCents: 0, slots: 0, awardCents: 0 };
      expect(await codeOf(() => service.createProgram('u1', dto as never))).toBe(
        'SLUG_TAKEN',
      );
    });

    it('creates a program with an initial cycle', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue(null);
      m(prisma, 'scholarshipProgram.create').mockResolvedValue({
        id: 'p1',
        slug: 'acme',
        cycles: [{ year: 2026, budgetCents: 6000000, slots: 3 }],
      });
      const { service } = make(prisma);
      const dto = {
        slug: 'acme',
        name: 'Acme',
        year: 2026,
        budgetCents: 6000000,
        slots: 3,
        awardCents: 2000000,
      };
      const res = await service.createProgram('u1', dto as never);
      expect(res.activeCycle.year).toBe(2026);
    });
  });

  describe('setForm', () => {
    function ownedProgram(prisma: ReturnType<typeof buildPrisma>) {
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
    }

    it('rejects an invalid schema', async () => {
      const prisma = buildPrisma();
      ownedProgram(prisma);
      const { service } = make(prisma);
      const dto = { title: 'T', fields: [{ fieldKey: 'a', label: '', type: 'TEXT' }] };
      expect(await codeOf(() => service.setForm('u1', 'p1', dto as never))).toBe(
        'INVALID_FORM_SCHEMA',
      );
    });

    it('persists a valid schema (new form)', async () => {
      const prisma = buildPrisma();
      ownedProgram(prisma);
      m(prisma, '__tx.applicationForm.findUnique').mockResolvedValue(null);
      m(prisma, '__tx.applicationForm.findUniqueOrThrow').mockResolvedValue({ id: 'frm1' });
      const { service } = make(prisma);
      const dto = {
        title: 'T',
        fields: [{ fieldKey: 'why', label: 'Why', type: 'LONG_TEXT', rubricWeight: 3 }],
      };
      const res = await service.setForm('u1', 'p1', dto as never);
      expect(res.fieldCount).toBe(1);
    });

    it('replaces the fields of an existing form', async () => {
      const prisma = buildPrisma();
      ownedProgram(prisma);
      m(prisma, '__tx.applicationForm.findUnique').mockResolvedValue({ id: 'frm1' });
      m(prisma, '__tx.applicationForm.findUniqueOrThrow').mockResolvedValue({ id: 'frm1' });
      const { service } = make(prisma);
      const dto = {
        title: 'T2',
        intro: 'hi',
        fields: [{ fieldKey: 'a', label: 'A', type: 'TEXT' }],
      };
      await service.setForm('u1', 'p1', dto as never);
      expect(m(prisma, '__tx.formField.deleteMany')).toHaveBeenCalled();
    });
  });

  describe('addReviewer', () => {
    function ownedProgram(prisma: ReturnType<typeof buildPrisma>) {
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
    }

    it('enforces the reviewer limit', async () => {
      const prisma = buildPrisma();
      ownedProgram(prisma);
      m(prisma, 'programReviewer.count').mockResolvedValue(10);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.addReviewer('u1', 'p1', {
            reviewerName: 'A',
            reviewerEmail: 'a@b.co',
          }),
        ),
      ).toBe('REVIEWER_LIMIT');
    });

    it('adds a reviewer below the limit', async () => {
      const prisma = buildPrisma();
      ownedProgram(prisma);
      m(prisma, 'programReviewer.count').mockResolvedValue(2);
      m(prisma, 'programReviewer.create').mockResolvedValue({ id: 'rev1' });
      const { service } = make(prisma);
      const res = await service.addReviewer('u1', 'p1', {
        reviewerName: 'A',
        reviewerEmail: 'a@b.co',
      });
      expect(res.reviewerId).toBe('rev1');
    });
  });

  describe('disburse (money to the school)', () => {
    function ownedAward(prisma: ReturnType<typeof buildPrisma>, award: object) {
      withOwner(prisma);
      m(prisma, 'scholarshipAward.findUnique').mockResolvedValue(award);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
    }

    it('blocks a second disbursement', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        payoutRef: 'already',
        school: { payoutVerified: true },
      });
      const { service } = make(prisma);
      expect(await codeOf(() => service.disburse('u1', 'a1'))).toBe('ALREADY_DISBURSED');
    });

    it('blocks an unverified school', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        payoutRef: null,
        school: { payoutVerified: false, name: 'S' },
      });
      const { service } = make(prisma);
      expect(await codeOf(() => service.disburse('u1', 'a1'))).toBe('SCHOOL_NOT_VERIFIED');
    });

    it('disburses to the school and appends a DISBURSEMENT ledger entry', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        schoolId: 'sch1',
        amountCents: 2000000,
        currency: 'EUR',
        payoutRef: null,
        school: { payoutVerified: true, name: 'ESMT', payoutAccountRef: 'DE00' },
      });
      const { service, payments, ledger } = make(prisma);
      const res = await service.disburse('u1', 'a1');
      expect(res.payoutRef).toBe('mock_payout_1');
      expect(m(payments, 'createPayout')).toHaveBeenCalledWith(
        expect.objectContaining({ schoolName: 'ESMT', amountCents: 2000000 }),
      );
      expect(m(ledger, 'append')).toHaveBeenCalledWith(
        expect.objectContaining({ entryType: 'DISBURSEMENT', schoolId: 'sch1' }),
      );
    });
  });

  describe('releaseTranche (conditional, still to the school)', () => {
    function ownedAward(prisma: ReturnType<typeof buildPrisma>, award: object) {
      withOwner(prisma);
      m(prisma, 'scholarshipAward.findUnique').mockResolvedValue(award);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
    }

    it('rejects when no tranche is configured', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        trancheStatus: 'NONE',
        trancheCents: 0,
        school: { payoutVerified: true },
      });
      const { service } = make(prisma);
      expect(await codeOf(() => service.releaseTranche('u1', 'a1', { gpa: 3.9 }))).toBe(
        'NO_TRANCHE_CONFIGURED',
      );
    });

    it('holds when the gpa is below threshold', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        trancheStatus: 'HELD',
        trancheCents: 1000000,
        gpaThreshold: 3.5,
        school: { payoutVerified: true },
      });
      const { service, payments } = make(prisma);
      const res = await service.releaseTranche('u1', 'a1', { gpa: 3.0 });
      expect(res.decision).toBe('HELD');
      expect(m(payments, 'createPayout')).not.toHaveBeenCalled();
    });

    it('releases the tranche to the school when gpa meets threshold', async () => {
      const prisma = buildPrisma();
      ownedAward(prisma, {
        id: 'a1',
        programId: 'p1',
        schoolId: 'sch1',
        currency: 'EUR',
        trancheStatus: 'HELD',
        trancheCents: 1000000,
        gpaThreshold: 3.5,
        school: { payoutVerified: true, name: 'ESMT', payoutAccountRef: 'DE00' },
      });
      const { service, payments, ledger } = make(prisma);
      const res = await service.releaseTranche('u1', 'a1', { gpa: 3.8 });
      expect(res.decision).toBe('RELEASE');
      expect(m(payments, 'createPayout')).toHaveBeenCalled();
      expect(m(ledger, 'append')).toHaveBeenCalledWith(
        expect.objectContaining({ entryType: 'DISBURSEMENT', schoolId: 'sch1' }),
      );
    });
  });

  describe('guard branches', () => {
    it('scoreApplication rejects an unknown application', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.scoreApplication('u1', 'nope', { reviewerId: 'r', scores: [] }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('scoreApplication rejects a reviewer not on the program', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'application.findUnique').mockResolvedValue({ id: 'app1', programId: 'p1' });
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programReviewer.findFirst').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.scoreApplication('u1', 'app1', { reviewerId: 'ghost', scores: [] }),
        ),
      ).toBe('UNKNOWN_REVIEWER');
    });

    it('decide rejects a missing cycle', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.decide('u1', 'p1', { cycleYear: 2099 }))).toBe(
        'NO_CYCLE',
      );
    });

    it('decide rejects when no verified school exists', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findUnique').mockResolvedValue({
        budgetCents: 6000000,
        slots: 2,
        awardCents: 2000000,
      });
      m(prisma, 'application.findMany').mockResolvedValue([
        { id: 'app_a', consensusScore: 95 },
      ]);
      m(prisma, 'school.findFirst').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.decide('u1', 'p1', { cycleYear: 2026 }))).toBe(
        'NO_VERIFIED_SCHOOL',
      );
    });

    it('disburse rejects an unknown award', async () => {
      const prisma = buildPrisma();
      m(prisma, 'scholarshipAward.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.disburse('u1', 'nope'))).toBe('NOT_FOUND');
    });

    it('setScholarStatus rejects an unknown scholar', async () => {
      const prisma = buildPrisma();
      m(prisma, 'scholarRelationship.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() => service.setScholarStatus('u1', 'nope', { event: 'enroll' })),
      ).toBe('NOT_FOUND');
    });

    it('messageScholar rejects an unknown scholar', async () => {
      const prisma = buildPrisma();
      m(prisma, 'scholarRelationship.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.messageScholar('u1', 'nope', { channel: 'PUSH', body: 'hi' }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('submitApplication rejects when the program has no form', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
        status: 'SUBMITTED',
      });
      m(prisma, 'scholarshipProgram.findUniqueOrThrow').mockResolvedValue({ form: null });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.submitApplication('tok', {
            applicantName: 'A',
            applicantEmail: 'a@b.co',
            answers: {},
          }),
        ),
      ).toBe('NO_FORM');
    });

    it('renew rejects an already-existing cycle', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findFirst').mockResolvedValue({
        id: 'cyc1',
        year: 2026,
        budgetCents: 1,
        slots: 1,
        awardCents: 1,
      });
      m(prisma, 'programCycle.findUnique').mockResolvedValue({ id: 'cyc2' });
      const { service } = make(prisma);
      expect(await codeOf(() => service.renew('u1', 'p1', {}))).toBe('CYCLE_EXISTS');
    });
  });

  describe('decide', () => {
    it('awards winners against the cycle budget and targets a verified school', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findUnique').mockResolvedValue({
        budgetCents: 6000000,
        slots: 2,
        awardCents: 2000000,
      });
      m(prisma, 'application.findMany').mockResolvedValue([
        { id: 'app_a', consensusScore: 95 },
        { id: 'app_b', consensusScore: 80 },
      ]);
      m(prisma, 'school.findFirst').mockResolvedValue({ id: 'sch1', payoutVerified: true });
      m(prisma, '__tx.application.update').mockResolvedValue({ applicantName: 'Amara' });
      m(prisma, '__tx.scholarshipAward.create').mockResolvedValue({ id: 'awd1' });
      m(prisma, '__tx.scholarRelationship.create').mockResolvedValue({});
      const { service } = make(prisma);
      const res = await service.decide('u1', 'p1', { cycleYear: 2026 });
      expect(res.winners).toHaveLength(2);
      expect(res.spentCents).toBe(4000000);
    });
  });

  describe('scoreApplication + consensus', () => {
    it('upserts scores and recomputes the consensus', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
      });
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programReviewer.findFirst').mockResolvedValue({ id: 'rev1' });
      m(prisma, 'application.findUniqueOrThrow').mockResolvedValue({
        program: { form: { fields: [{ fieldKey: 'why', rubricWeight: 3 }] } },
        scores: [{ fieldKey: 'why', score: 5 }],
      });
      m(prisma, 'application.update').mockResolvedValue({});
      const { service } = make(prisma);
      const res = await service.scoreApplication('u1', 'app1', {
        reviewerId: 'rev1',
        scores: [{ fieldKey: 'why', score: 5 }],
      });
      expect(res.consensusScore).toBe(100);
    });
  });

  describe('setScholarStatus', () => {
    function ownedScholar(prisma: ReturnType<typeof buildPrisma>, status: string) {
      withOwner(prisma);
      m(prisma, 'scholarRelationship.findUnique').mockResolvedValue({
        id: 'scl1',
        programId: 'p1',
        status,
      });
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
    }

    it('advances a valid transition', async () => {
      const prisma = buildPrisma();
      ownedScholar(prisma, 'AWARDED');
      m(prisma, 'scholarRelationship.update').mockResolvedValue({
        id: 'scl1',
        status: 'ENROLLED',
      });
      const { service } = make(prisma);
      const res = await service.setScholarStatus('u1', 'scl1', { event: 'enroll' });
      expect(res.status).toBe('ENROLLED');
    });

    it('rejects an invalid transition', async () => {
      const prisma = buildPrisma();
      ownedScholar(prisma, 'WITHDRAWN');
      const { service } = make(prisma);
      expect(
        await codeOf(() => service.setScholarStatus('u1', 'scl1', { event: 'enroll' })),
      ).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('messageScholar', () => {
    it('sends via the mock messaging provider', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarRelationship.findUnique').mockResolvedValue({
        id: 'scl1',
        programId: 'p1',
        fullName: 'Amara',
      });
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      const { service, messaging } = make(prisma);
      const res = await service.messageScholar('u1', 'scl1', {
        channel: 'WHATSAPP',
        body: 'Welcome',
      });
      expect(res.sent).toBe(true);
      expect(messaging.count).toBe(1);
    });
  });

  describe('reports (E5 PDF/CSV + E14 diversity)', () => {
    function ownedProgramWithScholars(prisma: ReturnType<typeof buildPrisma>) {
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        name: 'Acme',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findFirst').mockResolvedValue({ id: 'cyc1', year: 2026 });
      m(prisma, 'scholarRelationship.findMany').mockResolvedValue([
        {
          status: 'GRADUATED',
          alumniNetwork: true,
          country: 'NG',
          scholar: { studentProfile: { gender: 'FEMALE', birthYear: 1996, firstGen: true } },
        },
      ]);
    }

    it('builds a CSV report', async () => {
      const prisma = buildPrisma();
      ownedProgramWithScholars(prisma);
      const { service } = make(prisma);
      const csv = await service.reportCsv('u1', 'p1');
      expect(csv).toContain('Metric,Value');
      expect(csv).toContain('Female share %,100');
    });

    it('builds a PDF report', async () => {
      const prisma = buildPrisma();
      ownedProgramWithScholars(prisma);
      const { service } = make(prisma);
      const pdf = await service.reportPdf('u1', 'p1');
      expect(pdf.startsWith('%PDF')).toBe(true);
    });
  });

  describe('renew', () => {
    it('creates the next-year cycle', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findFirst').mockResolvedValue({
        id: 'cyc1',
        year: 2026,
        budgetCents: 6000000,
        slots: 3,
        awardCents: 2000000,
      });
      m(prisma, 'programCycle.findUnique').mockResolvedValue(null);
      m(prisma, 'programCycle.create').mockResolvedValue({ year: 2027, budgetCents: 6000000 });
      m(prisma, 'applicationForm.findUnique').mockResolvedValue({
        fields: [{ id: 'f1' }, { id: 'f2' }],
      });
      const { service } = make(prisma);
      const res = await service.renew('u1', 'p1', {});
      expect(res.cycle.year).toBe(2027);
      expect(res.fieldsCopied).toBe(2);
    });
  });

  describe('program reads + ownership guards', () => {
    it('lists a sponsor programs with counts', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findMany').mockResolvedValue([
        {
          id: 'p1',
          name: 'Acme',
          slug: 'acme',
          brandPrimary: '#111',
          brandSecondary: '#222',
          cycles: [{ year: 2026 }],
          _count: { applications: 3, awards: 1, reviewers: 2 },
        },
      ]);
      const { service } = make(prisma);
      const res = await service.listPrograms('u1');
      expect(res[0].applicationCount).toBe(3);
    });

    it('returns a program with its form + reviewers', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique')
        .mockResolvedValueOnce({ id: 'p1', corporateProfileId: OWNER.id })
        .mockResolvedValueOnce({ id: 'p1', name: 'Acme', form: null, reviewers: [] });
      const { service } = make(prisma);
      const res = await service.getProgram('u1', 'p1');
      expect(res?.id).toBe('p1');
    });

    it('rejects an unknown program', async () => {
      const prisma = buildPrisma();
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.getProgram('u1', 'nope'))).toBe('NOT_FOUND');
    });

    it('rejects a program owned by someone else', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: 'other',
      });
      const { service } = make(prisma);
      expect(await codeOf(() => service.getProgram('u1', 'p1'))).toBe('FORBIDDEN');
    });

    it('lists applications with an awarded flag', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'application.findMany').mockResolvedValue([
        {
          id: 'app1',
          applicantName: 'Amara',
          applicantEmail: 'a@b.co',
          status: 'AWARDED',
          consensusScore: 90,
          _count: { answers: 3, scores: 2 },
          award: { id: 'awd1' },
        },
      ]);
      const { service } = make(prisma);
      const res = await service.listApplications('u1', 'p1');
      expect(res[0].awarded).toBe(true);
    });

    it('lists scholars with award info', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'scholarRelationship.findMany').mockResolvedValue([
        {
          id: 'scl1',
          fullName: 'Amara',
          status: 'ENROLLED',
          alumniNetwork: false,
          gpa: 3.6,
          award: { amountCents: 2000000, trancheStatus: 'HELD' },
        },
      ]);
      const { service } = make(prisma);
      const res = await service.listScholars('u1', 'p1');
      expect(res[0].amountCents).toBe(2000000);
    });
  });

  describe('application slot + public form', () => {
    it('creates a tokenized application slot', async () => {
      const prisma = buildPrisma();
      withOwner(prisma);
      m(prisma, 'scholarshipProgram.findUnique').mockResolvedValue({
        id: 'p1',
        corporateProfileId: OWNER.id,
      });
      m(prisma, 'programCycle.findFirst').mockResolvedValue({ id: 'cyc1' });
      m(prisma, 'application.create').mockResolvedValue({ id: 'app1' });
      const { service } = make(prisma);
      const res = await service.createApplicationSlot('u1', 'p1');
      expect(res.applicationId).toBe('app1');
      expect(typeof res.applyToken).toBe('string');
    });

    it('serves the public form for a valid token', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
      });
      m(prisma, 'scholarshipProgram.findUniqueOrThrow').mockResolvedValue({
        name: 'Acme',
        brandPrimary: '#111',
        brandSecondary: '#222',
        tagline: 'hi',
        form: {
          title: 'T',
          intro: null,
          fields: [{ fieldKey: 'why', label: 'Why', type: 'LONG_TEXT', required: true }],
        },
      });
      const { service } = make(prisma);
      const res = await service.publicForm('tok');
      expect(res.form.fields).toHaveLength(1);
    });

    it('rejects the public form when the program has no form', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
      });
      m(prisma, 'scholarshipProgram.findUniqueOrThrow').mockResolvedValue({ form: null });
      const { service } = make(prisma);
      expect(await codeOf(() => service.publicForm('tok'))).toBe('NO_FORM');
    });
  });

  describe('public application', () => {
    it('rejects an unknown token', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue(null);
      const { service } = make(prisma);
      expect(await codeOf(() => service.applicationStatus('bad'))).toBe('INVALID_TOKEN');
    });

    it('validates and stores answers for a valid submission', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
        status: 'SUBMITTED',
      });
      m(prisma, 'scholarshipProgram.findUniqueOrThrow').mockResolvedValue({
        form: {
          fields: [{ fieldKey: 'why', label: 'Why', type: 'LONG_TEXT', required: true }],
        },
      });
      m(prisma, '__tx.application.update').mockResolvedValue({ id: 'app1' });
      const { service } = make(prisma);
      const res = await service.submitApplication('tok', {
        applicantName: 'Amara O',
        applicantEmail: 'a@b.co',
        answers: { why: 'Because.' },
      });
      expect(res.applicationId).toBe('app1');
    });

    it('rejects answers missing a required field', async () => {
      const prisma = buildPrisma();
      m(prisma, 'application.findUnique').mockResolvedValue({
        id: 'app1',
        programId: 'p1',
        status: 'SUBMITTED',
      });
      m(prisma, 'scholarshipProgram.findUniqueOrThrow').mockResolvedValue({
        form: {
          fields: [{ fieldKey: 'why', label: 'Why', type: 'LONG_TEXT', required: true }],
        },
      });
      const { service } = make(prisma);
      expect(
        await codeOf(() =>
          service.submitApplication('tok', {
            applicantName: 'Amara O',
            applicantEmail: 'a@b.co',
            answers: {},
          }),
        ),
      ).toBe('INVALID_ANSWERS');
    });
  });
});
