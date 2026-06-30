import { Inject, Injectable } from '@nestjs/common';
import { DonationMethod, InvoiceStatus, RecognitionKind } from '@prisma/client';
import { percentOf } from '../campaigns/campaign.mapper';
import { DomainException } from '../common/domain.exception';
import { splitContribution } from '../donations/contribution.util';
import { DonationsService } from '../donations/donations.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { SponsorDto } from './dto/sponsor.dto';
import { EsgRow, computeEsgMetrics, toCsv } from './esg.util';
import { isFullTuition, tierAmount } from './gift-tiers.util';
import {
  buildInvoiceNo,
  computeInvoiceAmounts,
  documentTypeFor,
} from './invoice.util';
import { buildSimplePdf } from './pdf.util';

/**
 * Corporate (B2B) sponsorship channel — a self-contained path beside the donor
 * card flow. CARD uses `chargeImmediately` (automatic capture): a full-tuition
 * ticket closes the goal in one transaction with no all-or-nothing wait, then
 * triggers the tested `DonationsService.captureCampaign` to settle outstanding
 * donor pledges. SEPA records the pledge with an invoice that settles later.
 * The gated `donations.service.ts` is only used as a collaborator, never edited.
 */
@Injectable()
export class CorporateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly donations: DonationsService,
    private readonly notifications: NotificationsService,
  ) {}

  async sponsor(campaignId: string, userId: string, dto: SponsorDto) {
    const campaign = await this.loadDonatable(campaignId);
    const corp = await this.prisma.corporateProfile.findUnique({
      where: { userId },
    });
    if (!corp) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Create your company profile before sponsoring',
      );
    }

    const amount = tierAmount(
      dto.tier,
      campaign.goalCents,
      campaign.raisedCents,
      dto.amountCents ?? 0,
    );
    if (amount <= 0) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'This sponsorship amount is not valid for the remaining tuition gap',
      );
    }

    const { amountToGoal, tip } = splitContribution(
      campaign.goalCents,
      campaign.raisedCents,
      amount,
    );
    const fullTuition = isFullTuition(
      amount,
      campaign.goalCents,
      campaign.raisedCents,
    );
    const logo = dto.logoRecognition ?? false;
    const recognitionKind = this.recognitionKind(dto.scholarshipName, logo);
    const docType = documentTypeFor(logo);

    const payment =
      dto.method === DonationMethod.CARD
        ? await this.payments.chargeImmediately({
            amountCents: amount,
            currency: campaign.currency,
            method: 'CARD',
            description: `Corporate sponsorship for campaign ${campaign.id}`,
          })
        : await this.payments.createSepaPledge({
            amountCents: amount,
            currency: campaign.currency,
            method: 'SEPA',
            description: `Corporate SEPA sponsorship for campaign ${campaign.id}`,
          });

    if (payment.status === 'FAILED') {
      throw new DomainException(
        'PAYMENT_FAILED',
        payment.failureReason ?? 'Corporate payment failed',
        402,
      );
    }

    const invoiceStatus: InvoiceStatus =
      dto.method === DonationMethod.CARD ? 'PAID' : 'PENDING';
    const amounts = computeInvoiceAmounts(amountToGoal, docType);

    const recorded = await this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          campaignId: campaign.id,
          corporateProfileId: corp.id,
          amountCents: amountToGoal,
          tipCents: tip,
          method: dto.method,
          type: 'CORPORATE',
          status: 'SUCCEEDED',
          providerRef: payment.reference,
          message: dto.message,
          anonymous: recognitionKind === 'ANONYMOUS',
          donorName: corp.companyName,
        },
      });

      const sponsorship = await tx.corporateSponsorship.create({
        data: {
          donationId: donation.id,
          corporateProfileId: corp.id,
          campaignId: campaign.id,
          tier: dto.tier,
          fullTuition,
          scholarshipName: dto.scholarshipName ?? null,
          logoRecognition: logo,
          recognitionKind,
          impactReportOptIn: dto.impactReportOptIn ?? false,
          poNumber: dto.poNumber ?? null,
          vatId: dto.vatId ?? null,
        },
      });

      const invoice = await tx.invoice.create({
        data: {
          sponsorshipId: sponsorship.id,
          invoiceNo: buildInvoiceNo(
            donation.createdAt.getFullYear(),
            sponsorship.id,
          ),
          documentType: docType,
          netCents: amounts.netCents,
          vatCents: amounts.vatCents,
          grossCents: amounts.grossCents,
          currency: campaign.currency,
          vatId: dto.vatId ?? null,
          poNumber: dto.poNumber ?? null,
          status: invoiceStatus,
          settledAt: invoiceStatus === 'PAID' ? new Date() : null,
        },
      });

      const newRaised = campaign.raisedCents + amountToGoal;
      const funded = campaign.goalCents > 0 && newRaised >= campaign.goalCents;
      const updated = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          raisedCents: newRaised,
          tipsCents: campaign.tipsCents + tip,
          ...(funded && campaign.status !== 'FUNDED'
            ? { status: 'FUNDED' }
            : {}),
        },
      });

      return { donation, sponsorship, invoice, campaign: updated, funded };
    });

    let capture;
    if (recorded.funded) {
      // Full-tuition closed the goal: capture outstanding donor pledges (E2).
      capture = await this.donations.captureCampaign(campaign.id);
    }

    await this.fireNotifications(campaign, userId, {
      amountToGoal,
      prevRaised: campaign.raisedCents,
      newRaised: recorded.campaign.raisedCents,
      impactReportOptIn: dto.impactReportOptIn ?? false,
    });

    return {
      donation: recorded.donation,
      campaign: this.publicProgress(recorded.campaign),
      sponsorship: recorded.sponsorship,
      invoice: recorded.invoice,
      ...(capture ? { capture } : {}),
    };
  }

  async esg(userId: string) {
    const { profile, rows } = await this.esgData(userId);
    return {
      companyName: profile.companyName,
      metrics: computeEsgMetrics(rows),
      rows,
    };
  }

  async esgCsv(userId: string): Promise<string> {
    const { rows } = await this.esgData(userId);
    return toCsv(rows);
  }

  async esgPdf(userId: string): Promise<string> {
    const { profile, rows } = await this.esgData(userId);
    const metrics = computeEsgMetrics(rows);
    const lines = [
      `Sponsor: ${profile.companyName}`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      `Students supported: ${metrics.studentsSupported}`,
      `Countries reached: ${metrics.countriesReached}`,
      `Schools supported: ${metrics.schoolsSupported}`,
      `Total committed: EUR ${(metrics.totalCommittedCents / 100).toFixed(2)}`,
      `Full scholarships: ${metrics.fullScholarships}`,
      `Named scholarships: ${metrics.namedScholarships}`,
      '',
      'Sponsorships:',
      ...rows.map(
        (r) =>
          `- ${r.studentName} (${r.studentCountry}), ${r.schoolName}: EUR ${(r.amountCents / 100).toFixed(2)} [${r.tier}]`,
      ),
    ];
    return buildSimplePdf('Bursa ESG / CSR Impact Report', lines);
  }

  async invoice(userId: string, sponsorshipId: string) {
    const sponsorship = await this.ownedSponsorship(userId, sponsorshipId);
    if (!sponsorship.invoice) {
      throw new DomainException('NOT_FOUND', 'Invoice not found', 404);
    }
    return this.invoiceDoc(sponsorship);
  }

  async settle(userId: string, sponsorshipId: string) {
    const sponsorship = await this.ownedSponsorship(userId, sponsorshipId);
    if (!sponsorship.invoice || sponsorship.invoice.status !== 'PENDING') {
      throw new DomainException(
        'CONFLICT',
        'Only a pending SEPA invoice can be settled',
        409,
      );
    }
    await this.prisma.invoice.update({
      where: { id: sponsorship.invoice.id },
      data: { status: 'PAID', settledAt: new Date() },
    });
    const fresh = await this.ownedSponsorship(userId, sponsorshipId);
    return this.invoiceDoc(fresh);
  }

  // --- helpers ---

  private recognitionKind(
    scholarshipName: string | undefined,
    logo: boolean,
  ): RecognitionKind {
    if (scholarshipName) return 'NAMED';
    if (logo) return 'LOGO';
    return 'ANONYMOUS';
  }

  private async fireNotifications(
    campaign: { id: string; studentProfile?: { fullName: string } | null },
    userId: string,
    e: {
      amountToGoal: number;
      prevRaised: number;
      newRaised: number;
      impactReportOptIn: boolean;
    },
  ): Promise<void> {
    const studentName = campaign.studentProfile?.fullName ?? 'the student';
    await this.notifications.deliver(
      userId,
      {
        type: 'THANK_YOU',
        title: 'Thank you for your corporate gift',
        body: `Your sponsorship toward ${studentName}'s tuition goes directly to the school. An invoice is available in your dashboard.`,
      },
      campaign.id,
      { email: true },
    );
    if (e.impactReportOptIn) {
      await this.notifications.subscribe(userId, campaign.id);
    }
    await this.notifications.onDonation({
      donorUserId: null,
      campaignId: campaign.id,
      studentName,
      amountCents: e.amountToGoal,
      prevRaised: e.prevRaised,
      newRaised: e.newRaised,
      goalCents: 0,
    });
  }

  private async esgData(userId: string) {
    const profile = await this.prisma.corporateProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new DomainException(
        'NOT_FOUND',
        'Corporate profile not found',
        404,
      );
    }
    const sponsorships = await this.prisma.corporateSponsorship.findMany({
      where: { corporateProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        donation: true,
        campaign: {
          include: { studentProfile: true, school: true },
        },
      },
    });
    const rows: EsgRow[] = sponsorships.map((s) => ({
      campaignTitle: s.campaign.title,
      studentName: s.campaign.studentProfile.fullName,
      studentCountry: s.campaign.studentProfile.country,
      schoolName: s.campaign.school.name,
      amountCents: s.donation.amountCents,
      tier: s.tier,
      scholarshipName: s.scholarshipName,
      fullTuition: s.fullTuition,
      recognitionKind: s.recognitionKind,
      createdAt: s.createdAt,
    }));
    return { profile, rows };
  }

  private async ownedSponsorship(userId: string, sponsorshipId: string) {
    const sponsorship = await this.prisma.corporateSponsorship.findUnique({
      where: { id: sponsorshipId },
      include: {
        invoice: true,
        corporateProfile: true,
        campaign: { include: { school: true } },
      },
    });
    if (!sponsorship) {
      throw new DomainException('NOT_FOUND', 'Sponsorship not found', 404);
    }
    if (sponsorship.corporateProfile.userId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your sponsorship', 403);
    }
    return sponsorship;
  }

  private invoiceDoc(sponsorship: {
    invoice: {
      invoiceNo: string;
      documentType: string;
      netCents: number;
      vatCents: number;
      grossCents: number;
      currency: string;
      vatId: string | null;
      poNumber: string | null;
      status: string;
      settledAt: Date | null;
      issuedAt: Date;
    } | null;
    corporateProfile: { companyName: string };
    campaign: { title: string; school: { name: string } };
  }) {
    const inv = sponsorship.invoice!;
    return {
      invoiceNo: inv.invoiceNo,
      documentType: inv.documentType,
      netCents: inv.netCents,
      vatCents: inv.vatCents,
      grossCents: inv.grossCents,
      currency: inv.currency,
      vatId: inv.vatId,
      poNumber: inv.poNumber,
      status: inv.status,
      settledAt: inv.settledAt,
      issuedAt: inv.issuedAt,
      companyName: sponsorship.corporateProfile.companyName,
      campaignTitle: sponsorship.campaign.title,
      schoolName: sponsorship.campaign.school.name,
      issuer:
        inv.documentType === 'SPONSORING'
          ? 'Bursa gGmbH — sponsoring invoice (prototype, not a valid tax document)'
          : 'Bursa gGmbH — donation receipt (prototype, not a valid tax document)',
    };
  }

  private publicProgress(c: {
    id: string;
    status: string;
    goalCents: number;
    raisedCents: number;
    tipsCents: number;
    currency: string;
  }) {
    return {
      id: c.id,
      status: c.status,
      goalCents: c.goalCents,
      raisedCents: c.raisedCents,
      tipsCents: c.tipsCents,
      currency: c.currency,
      percent: percentOf(c.raisedCents, c.goalCents),
    };
  }

  private async loadDonatable(campaignId: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        verification: true,
        studentProfile: { select: { fullName: true } },
      },
    });
    if (
      !c ||
      c.verification?.status !== 'VERIFIED' ||
      !['LIVE', 'FUNDED', 'DISBURSED'].includes(c.status)
    ) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    if (c.status !== 'LIVE') {
      throw new DomainException(
        'CAMPAIGN_FULLY_FUNDED',
        'This campaign is no longer accepting sponsorships',
        409,
      );
    }
    if (c.raisedCents >= c.goalCents) {
      throw new DomainException(
        'CAMPAIGN_FULLY_FUNDED',
        'This campaign is already fully funded',
        409,
      );
    }
    return c;
  }
}
