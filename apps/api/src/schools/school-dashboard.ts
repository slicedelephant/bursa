// Pure aggregation for the real-time school dashboard (E8): per-student payout
// status, total budget, and donor stats by geography. No NestJS, no Prisma;
// operates on plain inputs and returns a new immutable report.

import { CampaignStatus, PayoutStatus } from '@prisma/client';
import {
  deriveStudentPayoutStatus,
  isPaidOut,
  StudentPayoutStatus,
} from './payout-status';

export interface DashboardCampaignInput {
  readonly id: string;
  readonly title: string;
  readonly studentName: string;
  readonly status: CampaignStatus;
  readonly goalCents: number;
  readonly raisedCents: number;
  readonly payout?: { readonly status: PayoutStatus } | null;
}

export interface DashboardDonationInput {
  readonly amountCents: number;
  readonly donorCountry?: string | null;
}

export interface DashboardStudentRow {
  readonly campaignId: string;
  readonly studentName: string;
  readonly title: string;
  readonly goalCents: number;
  readonly raisedCents: number;
  readonly progressPct: number;
  readonly payoutStatus: StudentPayoutStatus;
}

export interface DonorGeographyRow {
  readonly country: string;
  readonly donationCount: number;
  readonly amountCents: number;
}

export interface SchoolDashboard {
  readonly totals: {
    readonly totalStudents: number;
    readonly liveCampaigns: number;
    readonly fundedCampaigns: number;
    readonly totalGoalCents: number;
    readonly totalRaisedCents: number;
    readonly totalPaidOutCents: number;
    readonly pendingPayoutCents: number;
  };
  readonly students: readonly DashboardStudentRow[];
  readonly donorGeography: readonly DonorGeographyRow[];
}

function progressPct(raisedCents: number, goalCents: number): number {
  if (goalCents <= 0) return 0;
  return Math.min(100, Math.round((raisedCents / goalCents) * 100));
}

function toStudentRow(campaign: DashboardCampaignInput): DashboardStudentRow {
  return {
    campaignId: campaign.id,
    studentName: campaign.studentName,
    title: campaign.title,
    goalCents: campaign.goalCents,
    raisedCents: campaign.raisedCents,
    progressPct: progressPct(campaign.raisedCents, campaign.goalCents),
    payoutStatus: deriveStudentPayoutStatus(campaign),
  };
}

function donorGeography(
  donations: readonly DashboardDonationInput[],
): DonorGeographyRow[] {
  const byCountry = new Map<
    string,
    { donationCount: number; amountCents: number }
  >();
  for (const donation of donations) {
    const country = donation.donorCountry?.trim() || 'Unknown';
    const prev = byCountry.get(country) ?? { donationCount: 0, amountCents: 0 };
    byCountry.set(country, {
      donationCount: prev.donationCount + 1,
      amountCents: prev.amountCents + donation.amountCents,
    });
  }
  return [...byCountry.entries()]
    .map(([country, agg]) => ({ country, ...agg }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents || a.country.localeCompare(b.country),
    );
}

export function buildSchoolDashboard(
  campaigns: readonly DashboardCampaignInput[],
  donations: readonly DashboardDonationInput[],
): SchoolDashboard {
  const students = campaigns.map(toStudentRow);

  const totals = students.reduce(
    (acc, row) => {
      const paid = isPaidOut(row.payoutStatus);
      return {
        totalStudents: acc.totalStudents + 1,
        liveCampaigns:
          acc.liveCampaigns + (row.payoutStatus === 'AWAITING_FUNDING' ? 1 : 0),
        fundedCampaigns:
          acc.fundedCampaigns + (row.payoutStatus === 'READY' ? 1 : 0),
        totalGoalCents: acc.totalGoalCents + row.goalCents,
        totalRaisedCents: acc.totalRaisedCents + row.raisedCents,
        totalPaidOutCents: acc.totalPaidOutCents + (paid ? row.raisedCents : 0),
        pendingPayoutCents:
          acc.pendingPayoutCents +
          (row.payoutStatus === 'READY' ? row.raisedCents : 0),
      };
    },
    {
      totalStudents: 0,
      liveCampaigns: 0,
      fundedCampaigns: 0,
      totalGoalCents: 0,
      totalRaisedCents: 0,
      totalPaidOutCents: 0,
      pendingPayoutCents: 0,
    },
  );

  return { totals, students, donorGeography: donorGeography(donations) };
}
