/**
 * E21 Payroll-HRIS — pure payroll-giving-campaign aggregation.
 *
 * Folds the per-employee contribution + match results of a "match month" run into
 * one summary. No I/O, no mutation — integer minor units throughout. Confirms the
 * money going to the SCHOOL is exactly contributions + matches (the campaign is a
 * donor-side funding mechanism, not a payout path).
 */

export interface CampaignLine {
  readonly contributionCents: number;
  readonly matchCents: number;
}

export interface CampaignSummary {
  readonly contributions: number;
  readonly totalContributionCents: number;
  readonly totalMatchCents: number;
  /** Everything that flows to the school = contributions + matches. */
  readonly totalToSchoolCents: number;
  /** How many lines were capped by the per-employee balance. */
  readonly cappedCount: number;
}

/** Aggregate a campaign's per-employee lines into an immutable summary. */
export function summarizeCampaign(
  lines: readonly CampaignLine[],
): CampaignSummary {
  return lines.reduce<CampaignSummary>(
    (acc, line) => {
      const contribution = Math.max(0, Math.floor(line.contributionCents));
      const match = Math.max(0, Math.floor(line.matchCents));
      return {
        contributions: acc.contributions + 1,
        totalContributionCents: acc.totalContributionCents + contribution,
        totalMatchCents: acc.totalMatchCents + match,
        totalToSchoolCents: acc.totalToSchoolCents + contribution + match,
        cappedCount: acc.cappedCount,
      };
    },
    {
      contributions: 0,
      totalContributionCents: 0,
      totalMatchCents: 0,
      totalToSchoolCents: 0,
      cappedCount: 0,
    },
  );
}
