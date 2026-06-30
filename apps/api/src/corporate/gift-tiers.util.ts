import { SponsorshipTier } from '@prisma/client';

/**
 * Pure gift-tier maths for the corporate full-tuition CTA — no I/O. Presets are
 * deterministic fractions of the full programme cost (goal), always capped at
 * the remaining gap so a preset never overshoots; FULL is exactly the gap.
 * CUSTOM amounts are taken verbatim (over-funding is later split into a tip by
 * `splitContribution`). Returns new values; never mutates inputs.
 */
export interface GiftTierOption {
  readonly tier: SponsorshipTier;
  readonly label: string;
  readonly amountCents: number;
  readonly highlight?: boolean;
}

export function remainingGapCents(
  goalCents: number,
  raisedCents: number,
): number {
  return Math.max(0, goalCents - raisedCents);
}

export function giftTiers(
  goalCents: number,
  raisedCents: number,
): GiftTierOption[] {
  const gap = remainingGapCents(goalCents, raisedCents);
  if (gap <= 0) return [];
  const cap = (value: number) => Math.min(gap, value);
  const tiers: GiftTierOption[] = [
    {
      tier: 'SEMESTER',
      label: 'One semester',
      amountCents: cap(Math.round(goalCents / 4)),
    },
    {
      tier: 'YEAR',
      label: 'One year',
      amountCents: cap(Math.round(goalCents / 2)),
    },
    { tier: 'FULL', label: 'Full tuition', amountCents: gap, highlight: true },
  ];
  return tiers.filter((t) => t.amountCents > 0);
}

export function tierAmount(
  tier: SponsorshipTier,
  goalCents: number,
  raisedCents: number,
  customCents = 0,
): number {
  if (tier === 'CUSTOM') return Math.max(0, customCents);
  const match = giftTiers(goalCents, raisedCents).find((t) => t.tier === tier);
  return match?.amountCents ?? 0;
}

export function isFullTuition(
  amountCents: number,
  goalCents: number,
  raisedCents: number,
): boolean {
  const gap = remainingGapCents(goalCents, raisedCents);
  return gap > 0 && amountCents >= gap;
}
