import { GiftTier, SponsorshipTier } from '../../core/models';

/**
 * Pure client-side mirror of the backend gift-tier maths (kept in sync with
 * apps/api/src/corporate/gift-tiers.util.ts). Drives the corporate CTA: presets
 * are fractions of the full programme cost, always capped at the remaining gap;
 * FULL is exactly the gap. No I/O; returns new values, never mutates inputs.
 */
export function remainingGapCents(goalCents: number, raisedCents: number): number {
  return Math.max(0, goalCents - raisedCents);
}

export function giftTiers(goalCents: number, raisedCents: number): GiftTier[] {
  const gap = remainingGapCents(goalCents, raisedCents);
  if (gap <= 0) return [];
  const cap = (value: number) => Math.min(gap, value);
  const tiers: GiftTier[] = [
    { tier: 'SEMESTER', label: 'One semester', amountCents: cap(Math.round(goalCents / 4)) },
    { tier: 'YEAR', label: 'One year', amountCents: cap(Math.round(goalCents / 2)) },
    { tier: 'FULL', label: 'Full tuition', amountCents: gap, highlight: true },
  ];
  return tiers.filter((t) => t.amountCents > 0);
}

export function isFullTuition(
  amountCents: number,
  goalCents: number,
  raisedCents: number,
): boolean {
  const gap = remainingGapCents(goalCents, raisedCents);
  return gap > 0 && amountCents >= gap;
}

export function tierBadge(tier: GiftTier): string | null {
  return tier.highlight ? 'Highest impact' : null;
}

export function tierName(tier: SponsorshipTier): string {
  switch (tier) {
    case 'SEMESTER':
      return 'One semester';
    case 'YEAR':
      return 'One year';
    case 'FULL':
      return 'Full tuition';
    default:
      return 'Custom amount';
  }
}
