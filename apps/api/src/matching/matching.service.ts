import { Inject, Injectable } from '@nestjs/common';
import { Campaign, User } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { buildSimplePdf } from '../corporate/pdf.util';
import { splitContribution } from '../donations/contribution.util';
import { PrismaService } from '../prisma/prisma.service';
import { extractDomain } from './email-domain';
import {
  EMPLOYER_MATCH_PROVIDER,
  type EmployerMatchProvider,
} from './employer-match.provider.interface';
import { evaluateEligibility, MatchProgram } from './employer-match-lookup';
import { computeMatch, remainingAnnualCents } from './match-amount';
import { resolveLabels } from './match-labels';
import {
  buildApplyUrl,
  buildBalanceView,
  buildClaimView,
  buildOfferView,
  ineligibleOffer,
  MatchBalanceView,
  MatchClaimView,
  MatchOfferView,
} from './match-view';

const CENTS = (cents: number): number => Math.round(cents / 100);

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMPLOYER_MATCH_PROVIDER)
    private readonly provider: EmployerMatchProvider,
  ) {}

  /** Detect an employer program from a work email; persist for a logged-in donor. */
  async detect(
    workEmail: string,
    locale: string | undefined,
    donorUserId?: string,
  ): Promise<MatchOfferView> {
    const program = await this.lookup(workEmail);
    if (!program || !program.active) return ineligibleOffer();

    if (donorUserId) {
      await this.prisma.user.update({
        where: { id: donorUserId },
        data: {
          employerName: program.employerName,
          employerDomain: program.domain,
        },
      });
    }

    const remaining = program.annualCapCents;
    return buildOfferView(
      program,
      0,
      remaining,
      false,
      resolveLabels(locale, {
        employerName: program.employerName,
        matchEur: 0,
        capEur: CENTS(program.annualCapCents),
        remainingEur: CENTS(remaining),
      }),
    );
  }

  /** Compute the localised match offer for a concrete donation. */
  async offer(
    campaignId: string,
    donationCents: number,
    locale: string | undefined,
    workEmail?: string,
    donorUserId?: string,
  ): Promise<MatchOfferView> {
    await this.loadCampaign(campaignId);
    const { program, user } = await this.resolveProgram(workEmail, donorUserId);
    const eligibility = evaluateEligibility(program, donationCents);
    if (!eligibility.eligible || !eligibility.program) return ineligibleOffer();

    const used = this.usedThisYear(user);
    const remaining = remainingAnnualCents(
      eligibility.program.annualCapCents,
      used,
    );
    const { matchCents, capped } = computeMatch(
      donationCents,
      eligibility.program.matchRatio,
      remaining,
    );

    return buildOfferView(
      eligibility.program,
      matchCents,
      remaining,
      capped,
      resolveLabels(locale, {
        employerName: eligibility.program.employerName,
        matchEur: CENTS(matchCents),
        capEur: CENTS(eligibility.program.annualCapCents),
        remainingEur: CENTS(remaining),
      }),
    );
  }

  /**
   * Claim the match: idempotent MatchClaim, claim artefact (link or PDF), and the
   * committed CORPORATE match donation booked onto the campaign. All transactional.
   */
  async claim(
    donationId: string,
    locale: string | undefined,
    workEmail?: string,
    donorUserId?: string,
  ): Promise<MatchClaimView> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { campaign: true },
    });
    if (!donation)
      throw new DomainException('NOT_FOUND', 'Donation not found', 404);

    const existing = await this.prisma.matchClaim.findUnique({
      where: { donationId },
    });
    if (existing) {
      throw new DomainException(
        'CLAIM_EXISTS',
        'This donation has already been matched',
        409,
      );
    }

    const { program, user } = await this.resolveProgram(
      workEmail,
      donorUserId ?? donation.donorUserId ?? undefined,
    );
    const eligibility = evaluateEligibility(program, donation.amountCents);
    if (!eligibility.eligible || !eligibility.program) {
      throw new DomainException(
        'NOT_ELIGIBLE',
        'No active employer match for this donation',
        409,
      );
    }

    const used = this.usedThisYear(user);
    const remaining = remainingAnnualCents(
      eligibility.program.annualCapCents,
      used,
    );
    if (remaining <= 0) {
      throw new DomainException(
        'NO_MATCH_BUDGET',
        'No match budget left this year',
        409,
      );
    }

    const { matchToGoal } = this.matchTowardGoal(
      donation.campaign,
      computeMatch(
        donation.amountCents,
        eligibility.program.matchRatio,
        remaining,
      ).matchCents,
    );
    if (matchToGoal <= 0) {
      throw new DomainException(
        'NOT_ELIGIBLE',
        'This campaign is already fully funded',
        409,
      );
    }

    const programRow = await this.prisma.employerMatchProgram.findUnique({
      where: { domain: eligibility.program.domain },
    });
    if (!programRow) {
      throw new DomainException(
        'NOT_ELIGIBLE',
        'Employer program not provisioned',
        409,
      );
    }

    return this.commitClaim({
      donation,
      program: eligibility.program,
      programId: programRow.id,
      matchCents: matchToGoal,
      donorUserId: user?.id,
      locale,
      year: this.currentYear(),
    });
  }

  /** Remaining annual balance + claim history for the logged-in donor. */
  async balance(donorUserId: string): Promise<MatchBalanceView> {
    const user = await this.prisma.user.findUnique({
      where: { id: donorUserId },
    });
    if (!user) throw new DomainException('NOT_FOUND', 'User not found', 404);

    const program = user.employerDomain
      ? await this.lookup(user.employerDomain)
      : null;
    const claims = await this.prisma.matchClaim.findMany({
      where: { donorUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { title: true, school: { select: { name: true } } },
        },
      },
    });

    return buildBalanceView({
      employerName: user.employerName,
      domain: user.employerDomain,
      year: this.currentYear(),
      annualCapCents: program?.annualCapCents ?? null,
      usedCents: this.usedThisYear(user),
      claims: claims.map((c) => ({
        id: c.id,
        employerName: c.employerName,
        matchCents: c.matchCents,
        status: c.status,
        campaignTitle: c.campaign.title,
        schoolName: c.campaign.school.name,
        createdAt: c.createdAt,
      })),
    });
  }

  /** The claim confirmation PDF (MANUAL-level claims). */
  async claimDocument(donorUserId: string, claimId: string): Promise<string> {
    const claim = await this.prisma.matchClaim.findUnique({
      where: { id: claimId },
      include: { campaign: { select: { title: true } } },
    });
    if (!claim) throw new DomainException('NOT_FOUND', 'Claim not found', 404);
    if (claim.donorUserId !== donorUserId) {
      throw new DomainException('FORBIDDEN', 'Not your claim', 403);
    }
    return this.renderClaimPdf(
      claim.employerName,
      claim.matchCents,
      claim.campaign.title,
    );
  }

  // -- helpers ---------------------------------------------------------------

  private async lookup(
    workEmailOrDomain: string,
  ): Promise<MatchProgram | null> {
    const domain = workEmailOrDomain.includes('@')
      ? extractDomain(workEmailOrDomain)
      : workEmailOrDomain.trim().toLowerCase();
    if (!domain) return null;
    return this.provider.lookupByDomain(domain);
  }

  private async resolveProgram(
    workEmail: string | undefined,
    donorUserId: string | undefined,
  ): Promise<{ program: MatchProgram | null; user: User | null }> {
    const user = donorUserId
      ? await this.prisma.user.findUnique({ where: { id: donorUserId } })
      : null;
    const lookupKey = workEmail ?? user?.employerDomain ?? undefined;
    const program = lookupKey ? await this.lookup(lookupKey) : null;
    return { program, user };
  }

  private currentYear(): number {
    return new Date().getFullYear();
  }

  /** Match euros already used this calendar year (0 if the year has rolled). */
  private usedThisYear(user: User | null): number {
    if (!user) return 0;
    return user.matchYear === this.currentYear() ? user.matchUsedCents : 0;
  }

  /** Cap the committed match at the campaign's remaining gap (E2 over-funding rule). */
  private matchTowardGoal(campaign: Campaign, matchCents: number) {
    const { amountToGoal } = splitContribution(
      campaign.goalCents,
      campaign.raisedCents,
      matchCents,
    );
    return { matchToGoal: amountToGoal };
  }

  private renderClaimPdf(
    employerName: string,
    matchCents: number,
    campaignTitle: string,
  ): string {
    return buildSimplePdf('Employer Match Claim Confirmation', [
      `Employer: ${employerName}`,
      `Matched amount: €${CENTS(matchCents)}`,
      `Campaign: ${campaignTitle}`,
      '',
      'This confirms an employer-match pledge toward the campaign above.',
      'The matched funds are disbursed directly to the business school.',
      'Please submit this confirmation through your employer matching portal.',
    ]);
  }

  private async commitClaim(input: {
    donation: { id: string; campaignId: string; campaign: Campaign };
    program: MatchProgram;
    programId: string;
    matchCents: number;
    donorUserId?: string;
    locale: string | undefined;
    year: number;
  }): Promise<MatchClaimView> {
    const {
      donation,
      program,
      programId,
      matchCents,
      donorUserId,
      locale,
      year,
    } = input;
    const applyUrl = buildApplyUrl(
      program.applyUrlTemplate,
      matchCents,
      program.employerName,
    );
    const pdfRef =
      program.integrationLevel === 'MANUAL'
        ? `mock_match_pdf_${donation.id}`
        : null;

    const { claim, remaining } = await this.prisma.$transaction(async (tx) => {
      const matchDonation = await tx.donation.create({
        data: {
          campaignId: donation.campaignId,
          amountCents: matchCents,
          method: 'SEPA',
          type: 'CORPORATE',
          status: 'SUCCEEDED',
          providerRef: `mock_match_${donation.id}`,
          donorName: program.employerName,
        },
      });

      await tx.campaign.update({
        where: { id: donation.campaignId },
        data: {
          raisedCents: { increment: matchCents },
          ...(donation.campaign.raisedCents + matchCents >=
            donation.campaign.goalCents && donation.campaign.status !== 'FUNDED'
            ? { status: 'FUNDED' }
            : {}),
        },
      });

      const claim = await tx.matchClaim.create({
        data: {
          donationId: donation.id,
          matchDonationId: matchDonation.id,
          programId,
          donorUserId: donorUserId ?? null,
          campaignId: donation.campaignId,
          employerName: program.employerName,
          matchCents,
          status: 'CLAIMED',
          applyUrl,
          pdfRef,
          year,
        },
      });

      let remaining: number | undefined;
      if (donorUserId) {
        const user = await tx.user.findUnique({ where: { id: donorUserId } });
        const usedBefore = user?.matchYear === year ? user.matchUsedCents : 0;
        const updated = await tx.user.update({
          where: { id: donorUserId },
          data: {
            employerName: program.employerName,
            employerDomain: program.domain,
            matchYear: year,
            matchUsedCents: usedBefore + matchCents,
          },
        });
        remaining = remainingAnnualCents(
          program.annualCapCents,
          updated.matchUsedCents,
        );
      }

      return { claim, remaining };
    });

    return buildClaimView(
      {
        id: claim.id,
        status: claim.status,
        employerName: claim.employerName,
        matchCents: claim.matchCents,
        campaignId: claim.campaignId,
        applyUrl: claim.applyUrl,
        pdfRef: claim.pdfRef,
      },
      resolveLabels(locale, {
        employerName: program.employerName,
        matchEur: CENTS(matchCents),
        capEur: CENTS(program.annualCapCents),
        remainingEur: CENTS(remaining ?? 0),
      }).headline,
      remaining,
    );
  }

  private async loadCampaign(campaignId: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign)
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    return campaign;
  }
}
