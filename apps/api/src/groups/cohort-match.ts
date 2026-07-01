/**
 * E18 Groups — pure cohort-match allocation. When a corporate sponsor matches a
 * whole cohort, this splits the total across the sub-campaigns. It is MONEY-FREE
 * and deterministic: it only computes the per-campaign amounts. The actual money
 * movement runs through the EXISTING E5 CorporateService.sponsor flow — E18 adds
 * NO new payment path and never writes to a Donation/Payout. Two modes:
 *  - 'GAP'   (default): allocate proportionally to each campaign's remaining gap,
 *             so no campaign is over-funded past its goal;
 *  - 'EVEN'  : split the total evenly across the sub-campaigns.
 * A deterministic remainder is assigned to the first campaign (id-sorted) so the
 * per-campaign amounts always sum exactly to the (capped) total. No mutation.
 */

export type CohortMatchMode = 'GAP' | 'EVEN';

export interface SubCampaign {
  readonly campaignId: string;
  /** Remaining cents to the campaign goal (never negative in practice). */
  readonly gapCents: number;
}

export interface CohortMatchInput {
  readonly subCampaigns: ReadonlyArray<SubCampaign>;
  readonly totalCents: number;
  readonly mode?: CohortMatchMode;
}

export interface CohortMatchAllocation {
  readonly campaignId: string;
  readonly amountCents: number;
}

export interface CohortMatchResult {
  readonly allocations: CohortMatchAllocation[];
  /** The total actually allocated (capped at the sum of gaps in GAP mode). */
  readonly allocatedCents: number;
}

function sorted(subs: ReadonlyArray<SubCampaign>): SubCampaign[] {
  return [...subs].sort((a, b) => a.campaignId.localeCompare(b.campaignId));
}

function distributeRemainder(
  base: CohortMatchAllocation[],
  remainder: number,
): CohortMatchAllocation[] {
  if (remainder <= 0 || base.length === 0) return base;
  return base.map((alloc, index) =>
    index === 0
      ? { ...alloc, amountCents: alloc.amountCents + remainder }
      : alloc,
  );
}

function allocateEven(subs: SubCampaign[], total: number): CohortMatchResult {
  const per = Math.floor(total / subs.length);
  const base = subs.map((s) => ({
    campaignId: s.campaignId,
    amountCents: per,
  }));
  const remainder = total - per * subs.length;
  const allocations = distributeRemainder(base, remainder);
  return { allocations, allocatedCents: total };
}

function allocateGap(subs: SubCampaign[], total: number): CohortMatchResult {
  const gaps = subs.map((s) => Math.max(0, s.gapCents));
  const totalGap = gaps.reduce((sum, g) => sum + g, 0);
  if (totalGap === 0) {
    return { allocations: [], allocatedCents: 0 };
  }
  // Never allocate more than the combined remaining gap (no over-funding).
  const capped = Math.min(total, totalGap);
  const base = subs.map((s, i) => ({
    campaignId: s.campaignId,
    amountCents: Math.min(gaps[i], Math.floor((capped * gaps[i]) / totalGap)),
  }));
  const assigned = base.reduce((sum, a) => sum + a.amountCents, 0);
  let remainder = capped - assigned;
  // Hand the rounding remainder to the first campaign that still has headroom.
  const allocations = base.map((alloc, i) => {
    if (remainder <= 0) return alloc;
    const headroom = gaps[i] - alloc.amountCents;
    const add = Math.min(headroom, remainder);
    remainder -= add;
    return { ...alloc, amountCents: alloc.amountCents + add };
  });
  const allocatedCents = allocations.reduce((sum, a) => sum + a.amountCents, 0);
  return { allocations, allocatedCents };
}

export function splitCohortMatch(input: CohortMatchInput): CohortMatchResult {
  const subs = sorted(input.subCampaigns);
  const total = Math.max(0, input.totalCents);
  if (subs.length === 0 || total === 0) {
    return { allocations: [], allocatedCents: 0 };
  }
  return input.mode === 'EVEN'
    ? allocateEven(subs, total)
    : allocateGap(subs, total);
}
