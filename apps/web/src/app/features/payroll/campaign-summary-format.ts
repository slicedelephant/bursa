import { CampaignRunResult } from '../../core/models';
import { eur } from './payroll-format';

/**
 * E21 — pure formatting of a payroll-giving-campaign result for the dashboard. No
 * I/O; returns new strings. Confirms the money-to-school total in the copy so the
 * admin sees that everything flows to the school, never to an employee.
 */

/** "3 employees gave €300, matched €300 — €600 to the school." */
export function campaignHeadline(result: CampaignRunResult): string {
  const noun = result.contributions === 1 ? 'employee' : 'employees';
  return (
    `${result.contributions} ${noun} gave ${eur(result.totalContributionCents)}, ` +
    `matched ${eur(result.totalMatchCents)} — ${eur(result.totalToSchoolCents)} to the school.`
  );
}

/** True when the run booked at least one contribution. */
export function hasContributions(result: CampaignRunResult): boolean {
  return result.contributions > 0;
}

/** Percentage of the school total made up by the company match (0-100). */
export function matchSharePercent(result: CampaignRunResult): number {
  if (!result.totalToSchoolCents || result.totalToSchoolCents <= 0) return 0;
  return Math.round((result.totalMatchCents / result.totalToSchoolCents) * 100);
}
