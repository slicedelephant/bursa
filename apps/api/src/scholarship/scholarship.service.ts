/**
 * E19 — Self-Serve Corporate Scholarship Program Manager (orchestration).
 *
 * Thin service over the pure cores + reused infra. Money NEVER touches a scholar:
 * awards disburse to the verified SCHOOL via the E2/E12 `PaymentProvider.createPayout`
 * + append-only `LedgerService` (Constitution II). Scholar comms reuse the E17
 * `MessagingProvider` seam; impact reports reuse E5 PDF/CSV + E14 diversity.
 * Returns plain data; the `{success,data,error}` envelope is applied by the
 * global interceptor. Errors are thrown as `DomainException(code, msg, status)`.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { aggregateDiversity } from '../esg/diversity-aggregator';
import { buildSimplePdf } from '../corporate/pdf.util';
import { LedgerService } from '../ledger/ledger.service';
import {
  MESSAGING_PROVIDER,
  type MessagingProvider,
} from '../impact-feed/messaging/messaging-provider.interface';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { validateAnswers } from './answer.validator';
import {
  createApplicationToken,
  hashToken,
  isTokenActive,
} from './application-token';
import { decideAwards } from './award-decision';
import { decideConditionalRelease } from './conditional-disbursement';
import { evaluateVisibility } from './conditional-logic';
import { FormFieldSpec, validateFormSchema } from './form-schema.validator';
import { planRenewal } from './program-cycle';
import { buildProgramOutcome } from './outcome-aggregator';
import {
  reportPdfTitle,
  ReportView,
  toReportCsv,
  toReportPdfLines,
} from './report-builder';
import { aggregateRubric, RubricScore } from './rubric-aggregator';
import {
  nextScholarStatus,
  ScholarEvent,
  ScholarStatus,
} from './scholar-status';
import { CreateProgramDto } from './dto/create-program.dto';
import { FormSchemaDto } from './dto/form-schema.dto';
import {
  AddReviewerDto,
  DecideAwardsDto,
  MessageScholarDto,
  ReleaseTrancheDto,
  RenewProgramDto,
  ScholarStatusDto,
} from './dto/misc.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';

const MAX_REVIEWERS = 10;

@Injectable()
export class ScholarshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    @Inject(MESSAGING_PROVIDER) private readonly messaging: MessagingProvider,
  ) {}

  // ---- Program admin --------------------------------------------------------

  private async ownerProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.corporateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new DomainException(
        'NO_CORPORATE_PROFILE',
        'You need a corporate profile to run a scholarship program',
        403,
      );
    }
    return profile.id;
  }

  private async ownedProgram(userId: string, programId: string) {
    const program = await this.prisma.scholarshipProgram.findUnique({
      where: { id: programId },
    });
    if (!program) {
      throw new DomainException('NOT_FOUND', 'Program not found', 404);
    }
    const profileId = await this.ownerProfileId(userId);
    if (program.corporateProfileId !== profileId) {
      throw new DomainException('FORBIDDEN', 'Not your program', 403);
    }
    return program;
  }

  async createProgram(userId: string, dto: CreateProgramDto) {
    const corporateProfileId = await this.ownerProfileId(userId);

    const clash = await this.prisma.scholarshipProgram.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (clash) {
      throw new DomainException(
        'SLUG_TAKEN',
        'That slug is already in use',
        409,
      );
    }

    const program = await this.prisma.scholarshipProgram.create({
      data: {
        corporateProfileId,
        name: dto.name,
        slug: dto.slug,
        logoUrl: dto.logoUrl ?? null,
        brandPrimary: dto.brandPrimary ?? '#4d977c',
        brandSecondary: dto.brandSecondary ?? '#6ca5c3',
        tagline: dto.tagline ?? null,
        cycles: {
          create: {
            year: dto.year,
            budgetCents: dto.budgetCents,
            slots: dto.slots,
            awardCents: dto.awardCents,
          },
        },
      },
      include: { cycles: true },
    });

    const activeCycle = program.cycles[0];
    return {
      id: program.id,
      slug: program.slug,
      activeCycle: {
        year: activeCycle.year,
        budgetCents: activeCycle.budgetCents,
        slots: activeCycle.slots,
      },
    };
  }

  async listPrograms(userId: string) {
    const corporateProfileId = await this.ownerProfileId(userId);
    const programs = await this.prisma.scholarshipProgram.findMany({
      where: { corporateProfileId },
      include: {
        cycles: { orderBy: { year: 'desc' } },
        _count: {
          select: { applications: true, awards: true, reviewers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brandPrimary: p.brandPrimary,
      brandSecondary: p.brandSecondary,
      activeCycle: p.cycles[0] ?? null,
      applicationCount: p._count.applications,
      awardCount: p._count.awards,
      reviewerCount: p._count.reviewers,
    }));
  }

  async getProgram(userId: string, programId: string) {
    await this.ownedProgram(userId, programId);
    const program = await this.prisma.scholarshipProgram.findUnique({
      where: { id: programId },
      include: {
        cycles: { orderBy: { year: 'desc' } },
        form: { include: { fields: { orderBy: { order: 'asc' } } } },
        reviewers: true,
      },
    });
    return program;
  }

  async setForm(userId: string, programId: string, dto: FormSchemaDto) {
    await this.ownedProgram(userId, programId);

    const specs: FormFieldSpec[] = dto.fields.map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
      rubricWeight: f.rubricWeight,
      showIfFieldId: f.showIfFieldId ?? null,
      showIfValue: f.showIfValue ?? null,
    }));

    const validation = validateFormSchema(specs);
    if (!validation.valid) {
      throw new DomainException(
        'INVALID_FORM_SCHEMA',
        validation.errors.join('; '),
        400,
      );
    }

    const form = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.applicationForm.findUnique({
        where: { programId },
        select: { id: true },
      });
      if (existing) {
        await tx.formField.deleteMany({ where: { formId: existing.id } });
        await tx.applicationForm.update({
          where: { programId },
          data: { title: dto.title, intro: dto.intro ?? null },
        });
      } else {
        await tx.applicationForm.create({
          data: { programId, title: dto.title, intro: dto.intro ?? null },
        });
      }
      const created = await tx.applicationForm.findUniqueOrThrow({
        where: { programId },
      });
      await tx.formField.createMany({
        data: dto.fields.map((f, index) => ({
          formId: created.id,
          fieldKey: f.fieldKey,
          label: f.label,
          type: f.type,
          required: f.required ?? false,
          options: f.options ?? [],
          rubricWeight: f.rubricWeight ?? 0,
          showIfFieldId: f.showIfFieldId ?? null,
          showIfValue: f.showIfValue ?? null,
          order: index,
        })),
      });
      return created;
    });

    return { formId: form.id, fieldCount: dto.fields.length };
  }

  async addReviewer(userId: string, programId: string, dto: AddReviewerDto) {
    await this.ownedProgram(userId, programId);
    const count = await this.prisma.programReviewer.count({
      where: { programId },
    });
    if (count >= MAX_REVIEWERS) {
      throw new DomainException(
        'REVIEWER_LIMIT',
        `A program can have at most ${MAX_REVIEWERS} reviewers`,
        409,
      );
    }
    const reviewer = await this.prisma.programReviewer.create({
      data: {
        programId,
        reviewerName: dto.reviewerName,
        reviewerEmail: dto.reviewerEmail,
      },
    });
    return { reviewerId: reviewer.id };
  }

  // ---- Public application (token-gated) -------------------------------------

  async publicForm(rawToken: string) {
    const application = await this.findByToken(rawToken);
    const program = await this.prisma.scholarshipProgram.findUniqueOrThrow({
      where: { id: application.programId },
      include: { form: { include: { fields: { orderBy: { order: 'asc' } } } } },
    });
    if (!program.form) {
      throw new DomainException('NO_FORM', 'This program has no form yet', 404);
    }
    return {
      program: {
        name: program.name,
        brandPrimary: program.brandPrimary,
        brandSecondary: program.brandSecondary,
        tagline: program.tagline,
      },
      form: {
        title: program.form.title,
        intro: program.form.intro,
        fields: program.form.fields.map((f) => ({
          fieldKey: f.fieldKey,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options,
          showIfFieldId: f.showIfFieldId,
          showIfValue: f.showIfValue,
        })),
      },
    };
  }

  async submitApplication(rawToken: string, dto: SubmitApplicationDto) {
    const application = await this.findByToken(rawToken);
    const program = await this.prisma.scholarshipProgram.findUniqueOrThrow({
      where: { id: application.programId },
      include: { form: { include: { fields: { orderBy: { order: 'asc' } } } } },
    });
    if (!program.form) {
      throw new DomainException('NO_FORM', 'This program has no form yet', 404);
    }

    const specs = program.form.fields.map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      type: f.type as FormFieldSpec['type'],
      required: f.required,
      options: f.options,
      rubricWeight: f.rubricWeight,
      showIfFieldId: f.showIfFieldId,
      showIfValue: f.showIfValue,
    }));

    const visibility = evaluateVisibility(specs, dto.answers);
    const result = validateAnswers({
      fields: specs,
      answers: dto.answers,
      visibility,
    });
    if (!result.valid) {
      throw new DomainException(
        'INVALID_ANSWERS',
        result.errors.join('; '),
        400,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: application.id },
        data: {
          applicantName: dto.applicantName,
          applicantEmail: dto.applicantEmail,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
      await tx.applicationAnswer.deleteMany({
        where: { applicationId: app.id },
      });
      const visibleAnswers = Object.entries(dto.answers).filter(
        ([key]) => visibility[key] !== false,
      );
      if (visibleAnswers.length > 0) {
        await tx.applicationAnswer.createMany({
          data: visibleAnswers.map(([fieldKey, value]) => ({
            applicationId: app.id,
            fieldKey,
            value: String(value),
          })),
        });
      }
      return app;
    });

    return { applicationId: updated.id };
  }

  async applicationStatus(rawToken: string) {
    const application = await this.findByToken(rawToken);
    return { status: application.status };
  }

  private async findByToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const application = await this.prisma.application.findUnique({
      where: { tokenHash },
    });
    if (!application || !isTokenActive({ tokenHash })) {
      throw new DomainException(
        'INVALID_TOKEN',
        'Invalid application token',
        401,
      );
    }
    return application;
  }

  /**
   * Provisions a blank tokenized application slot so a candidate can open the
   * apply link. Returns the raw token exactly once. Owner-scoped.
   */
  async createApplicationSlot(userId: string, programId: string) {
    await this.ownedProgram(userId, programId);
    const cycle = await this.activeCycle(programId);
    const { token, tokenHash } = createApplicationToken();
    const application = await this.prisma.application.create({
      data: {
        programId,
        cycleId: cycle.id,
        tokenHash,
        applicantName: '',
        applicantEmail: '',
        status: 'SUBMITTED',
      },
    });
    return { applicationId: application.id, applyToken: token };
  }

  // ---- Review + award decision ----------------------------------------------

  async listApplications(userId: string, programId: string) {
    await this.ownedProgram(userId, programId);
    const applications = await this.prisma.application.findMany({
      where: { programId },
      include: {
        _count: { select: { answers: true, scores: true } },
        award: true,
      },
      orderBy: { consensusScore: 'desc' },
    });
    return applications.map((a) => ({
      id: a.id,
      applicantName: a.applicantName,
      applicantEmail: a.applicantEmail,
      status: a.status,
      consensusScore: a.consensusScore,
      answerCount: a._count.answers,
      scoreCount: a._count.scores,
      awarded: a.award != null,
    }));
  }

  async scoreApplication(
    userId: string,
    applicationId: string,
    dto: ReviewScoreDto,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        program: { include: { form: { include: { fields: true } } } },
      },
    });
    if (!application) {
      throw new DomainException('NOT_FOUND', 'Application not found', 404);
    }
    await this.ownedProgram(userId, application.programId);

    const reviewer = await this.prisma.programReviewer.findFirst({
      where: { id: dto.reviewerId, programId: application.programId },
      select: { id: true },
    });
    if (!reviewer) {
      throw new DomainException(
        'UNKNOWN_REVIEWER',
        'Reviewer not on this program',
        400,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const s of dto.scores) {
        await tx.reviewScore.upsert({
          where: {
            applicationId_reviewerId_fieldKey: {
              applicationId,
              reviewerId: dto.reviewerId,
              fieldKey: s.fieldKey,
            },
          },
          create: {
            applicationId,
            reviewerId: dto.reviewerId,
            fieldKey: s.fieldKey,
            score: s.score,
            comment: s.comment ?? null,
          },
          update: { score: s.score, comment: s.comment ?? null },
        });
      }
    });

    const consensusScore = await this.recomputeConsensus(applicationId);
    return { consensusScore };
  }

  private async recomputeConsensus(applicationId: string): Promise<number> {
    const application = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        program: { include: { form: { include: { fields: true } } } },
        scores: true,
      },
    });
    const fields = (application.program.form?.fields ?? []).map((f) => ({
      fieldKey: f.fieldKey,
      rubricWeight: f.rubricWeight,
    }));
    const scores: RubricScore[] = application.scores.map((s) => ({
      fieldKey: s.fieldKey,
      score: s.score,
    }));
    const { consensus } = aggregateRubric({ fields, scores });
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { consensusScore: consensus, status: 'UNDER_REVIEW' },
    });
    return consensus;
  }

  async decide(userId: string, programId: string, dto: DecideAwardsDto) {
    await this.ownedProgram(userId, programId);
    const cycle = await this.prisma.programCycle.findUnique({
      where: { programId_year: { programId, year: dto.cycleYear } },
    });
    if (!cycle) {
      throw new DomainException('NO_CYCLE', 'No cycle for that year', 404);
    }

    const applications = await this.prisma.application.findMany({
      where: { programId, award: null },
      select: { id: true, consensusScore: true },
    });

    const decision = decideAwards({
      ranked: applications.map((a) => ({
        appId: a.id,
        consensusScore: a.consensusScore,
      })),
      budgetCents: cycle.budgetCents,
      slots: cycle.slots,
      awardCents: cycle.awardCents,
    });

    const targetSchool = await this.defaultAwardSchool();

    const winners = await this.prisma.$transaction(async (tx) => {
      const created: {
        applicationId: string;
        amountCents: number;
        awardId: string;
      }[] = [];
      for (const w of decision.winners) {
        const app = await tx.application.update({
          where: { id: w.appId },
          data: { status: 'AWARDED' },
        });
        const award = await tx.scholarshipAward.create({
          data: {
            programId,
            applicationId: w.appId,
            schoolId: targetSchool.id,
            amountCents: w.amountCents,
            trancheCents: Math.round(w.amountCents / 2),
            gpaThreshold: 3.0,
            trancheStatus: 'HELD',
          },
        });
        await tx.scholarRelationship.create({
          data: {
            programId,
            awardId: award.id,
            fullName: app.applicantName || 'Scholar',
            status: 'AWARDED',
          },
        });
        created.push({
          applicationId: w.appId,
          amountCents: w.amountCents,
          awardId: award.id,
        });
      }
      return created;
    });

    return {
      winners: winners.map((w) => ({
        applicationId: w.applicationId,
        awardId: w.awardId,
        amountCents: w.amountCents,
      })),
      spentCents: decision.spentCents,
    };
  }

  // ---- Award disbursement — ALWAYS to the school (E2/E12) --------------------

  async disburse(userId: string, awardId: string) {
    const award = await this.loadOwnedAward(userId, awardId);
    if (award.payoutRef) {
      throw new DomainException(
        'ALREADY_DISBURSED',
        'Award already disbursed',
        409,
      );
    }
    if (!award.school.payoutVerified) {
      throw new DomainException(
        'SCHOOL_NOT_VERIFIED',
        'The target school has no verified payout account',
        409,
      );
    }

    const payout = await this.payments.createPayout({
      amountCents: award.amountCents,
      currency: award.currency,
      schoolName: award.school.name,
      accountRef: award.school.payoutAccountRef ?? 'mock-account',
      description: `Scholarship award ${award.id} (tranche 1) to ${award.school.name}`,
    });

    const entry = await this.ledger.append({
      entryType: 'DISBURSEMENT',
      amountCents: award.amountCents,
      schoolId: award.schoolId,
      reason: `Scholarship award disbursement (program ${award.programId})`,
      actorUserId: userId,
      refType: 'scholarship_award',
      refId: award.id,
    });

    await this.prisma.scholarshipAward.update({
      where: { id: award.id },
      data: { payoutRef: payout.reference, ledgerRefId: entry.id },
    });

    return {
      awardId: award.id,
      schoolId: award.schoolId,
      amountCents: award.amountCents,
      payoutRef: payout.reference,
      ledgerRefId: entry.id,
    };
  }

  async releaseTranche(
    userId: string,
    awardId: string,
    dto: ReleaseTrancheDto,
  ) {
    const award = await this.loadOwnedAward(userId, awardId);
    if (award.trancheStatus === 'NONE' || award.trancheCents <= 0) {
      throw new DomainException(
        'NO_TRANCHE_CONFIGURED',
        'This award has no conditional tranche',
        409,
      );
    }
    if (award.trancheStatus === 'RELEASED') {
      throw new DomainException(
        'TRANCHE_ALREADY_RELEASED',
        'The conditional tranche was already released',
        409,
      );
    }

    const decision = decideConditionalRelease({
      gpa: dto.gpa,
      threshold: award.gpaThreshold ?? null,
      // Guarded above: at this point the tranche is NONE-excluded and not RELEASED.
      alreadyReleased: false,
    });

    if (decision.decision === 'HELD') {
      return { decision: 'HELD' as const, reason: decision.reason };
    }

    if (!award.school.payoutVerified) {
      throw new DomainException(
        'SCHOOL_NOT_VERIFIED',
        'The target school has no verified payout account',
        409,
      );
    }

    const payout = await this.payments.createPayout({
      amountCents: award.trancheCents,
      currency: award.currency,
      schoolName: award.school.name,
      accountRef: award.school.payoutAccountRef ?? 'mock-account',
      description: `Scholarship award ${award.id} (tranche 2) to ${award.school.name}`,
    });

    await this.ledger.append({
      entryType: 'DISBURSEMENT',
      amountCents: award.trancheCents,
      schoolId: award.schoolId,
      reason: `Scholarship conditional tranche release (program ${award.programId})`,
      actorUserId: userId,
      refType: 'scholarship_award_tranche',
      refId: award.id,
    });

    await this.prisma.scholarshipAward.update({
      where: { id: award.id },
      data: { trancheStatus: 'RELEASED', tranchePayoutRef: payout.reference },
    });

    return {
      decision: 'RELEASE' as const,
      schoolId: award.schoolId,
      trancheCents: award.trancheCents,
      tranchePayoutRef: payout.reference,
    };
  }

  private async loadOwnedAward(userId: string, awardId: string) {
    const award = await this.prisma.scholarshipAward.findUnique({
      where: { id: awardId },
      include: { school: true },
    });
    if (!award) {
      throw new DomainException('NOT_FOUND', 'Award not found', 404);
    }
    await this.ownedProgram(userId, award.programId);
    return award;
  }

  // ---- SRM: scholar status, messaging ---------------------------------------

  async listScholars(userId: string, programId: string) {
    await this.ownedProgram(userId, programId);
    const scholars = await this.prisma.scholarRelationship.findMany({
      where: { programId },
      include: { award: true },
      orderBy: { createdAt: 'desc' },
    });
    return scholars.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      status: s.status,
      alumniNetwork: s.alumniNetwork,
      gpa: s.gpa,
      amountCents: s.award?.amountCents ?? 0,
      trancheStatus: s.award?.trancheStatus ?? 'NONE',
    }));
  }

  async setScholarStatus(
    userId: string,
    scholarId: string,
    dto: ScholarStatusDto,
  ) {
    const scholar = await this.prisma.scholarRelationship.findUnique({
      where: { id: scholarId },
    });
    if (!scholar) {
      throw new DomainException('NOT_FOUND', 'Scholar not found', 404);
    }
    await this.ownedProgram(userId, scholar.programId);

    let transition;
    try {
      transition = nextScholarStatus(
        scholar.status as ScholarStatus,
        dto.event as ScholarEvent,
        new Date(),
      );
    } catch {
      throw new DomainException(
        'INVALID_STATUS_TRANSITION',
        `Cannot ${dto.event} a scholar in state ${scholar.status}`,
        400,
      );
    }

    const alumni =
      transition.status === 'GRADUATED' || transition.status === 'WORKING';

    const updated = await this.prisma.scholarRelationship.update({
      where: { id: scholarId },
      data: {
        status: transition.status,
        [transition.milestoneField]: transition.at,
        ...(alumni ? { alumniNetwork: true } : {}),
      },
    });

    return {
      scholarId: updated.id,
      status: updated.status,
      [transition.milestoneField]: transition.at.toISOString(),
    };
  }

  async messageScholar(
    userId: string,
    scholarId: string,
    dto: MessageScholarDto,
  ) {
    const scholar = await this.prisma.scholarRelationship.findUnique({
      where: { id: scholarId },
    });
    if (!scholar) {
      throw new DomainException('NOT_FOUND', 'Scholar not found', 404);
    }
    await this.ownedProgram(userId, scholar.programId);

    const result = await this.messaging.send({
      channel: dto.channel,
      to: scholar.fullName,
      body: dto.body,
    });

    return { sent: result.ok, ref: result.ref };
  }

  // ---- Impact report (E5 PDF/CSV + E14 diversity) ---------------------------

  private async buildReportView(
    userId: string,
    programId: string,
  ): Promise<ReportView> {
    const program = await this.ownedProgram(userId, programId);
    const cycle = await this.activeCycle(programId);
    const scholars = await this.prisma.scholarRelationship.findMany({
      where: { programId },
      include: { scholar: { include: { studentProfile: true } } },
    });

    const outcome = buildProgramOutcome(
      scholars.map((s) => ({
        status: s.status as ScholarStatus,
        alumniNetwork: s.alumniNetwork,
      })),
    );

    const diversity = aggregateDiversity(
      scholars.map((s) => ({
        gender: s.scholar?.studentProfile?.gender ?? null,
        birthYear: s.scholar?.studentProfile?.birthYear ?? null,
        country: s.country ?? s.scholar?.studentProfile?.country ?? null,
        firstGen: s.scholar?.studentProfile?.firstGen ?? null,
      })),
      cycle.year,
    );

    return {
      programName: program.name,
      cycleYear: cycle.year,
      outcome,
      diversity,
    };
  }

  async reportCsv(userId: string, programId: string): Promise<string> {
    const view = await this.buildReportView(userId, programId);
    return toReportCsv(view);
  }

  async reportPdf(userId: string, programId: string): Promise<string> {
    const view = await this.buildReportView(userId, programId);
    return buildSimplePdf(reportPdfTitle(view), toReportPdfLines(view));
  }

  // ---- Multi-cycle / renewal ------------------------------------------------

  async renew(userId: string, programId: string, dto: RenewProgramDto) {
    await this.ownedProgram(userId, programId);
    const cycle = await this.activeCycle(programId);

    const plan = planRenewal({
      cycle: {
        year: cycle.year,
        budgetCents: cycle.budgetCents,
        slots: cycle.slots,
        awardCents: cycle.awardCents,
      },
      now: new Date(),
      budgetCents: dto.budgetCents,
      slots: dto.slots,
      awardCents: dto.awardCents,
    });

    const existing = await this.prisma.programCycle.findUnique({
      where: { programId_year: { programId, year: plan.year } },
      select: { id: true },
    });
    if (existing) {
      throw new DomainException(
        'CYCLE_EXISTS',
        `Cycle ${plan.year} already exists`,
        409,
      );
    }

    const created = await this.prisma.programCycle.create({
      data: {
        programId,
        year: plan.year,
        budgetCents: plan.budgetCents,
        slots: plan.slots,
        awardCents: plan.awardCents,
        deadline: plan.deadline,
      },
    });

    const form = await this.prisma.applicationForm.findUnique({
      where: { programId },
      include: { fields: true },
    });

    return {
      cycle: { year: created.year, budgetCents: created.budgetCents },
      fieldsCopied: form?.fields.length ?? 0,
    };
  }

  // ---- helpers --------------------------------------------------------------

  private async activeCycle(programId: string) {
    const cycle = await this.prisma.programCycle.findFirst({
      where: { programId },
      orderBy: { year: 'desc' },
    });
    if (!cycle) {
      throw new DomainException('NO_CYCLE', 'Program has no cycle', 404);
    }
    return cycle;
  }

  /** The award disbursement target: a verified school (money never goes to a scholar). */
  private async defaultAwardSchool() {
    const school = await this.prisma.school.findFirst({
      where: { payoutVerified: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!school) {
      throw new DomainException(
        'NO_VERIFIED_SCHOOL',
        'No verified school available to receive the award',
        409,
      );
    }
    return school;
  }
}
