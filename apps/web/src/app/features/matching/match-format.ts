import { MatchBalance, MatchClaimStatus, MatchOffer } from '../../core/models';

/** Pure formatting helpers for the employer-match UI. No I/O; returns new strings. */

/** Whole-EUR string for an integer cents amount (e.g. 80000 → "€800"). */
export function eur(cents: number | null | undefined): string {
  return `€${Math.round((cents ?? 0) / 100)}`;
}

/** "€800 match still available this year" — uses the localised balance label. */
export function balanceLabel(balance: MatchBalance | null): string {
  if (!balance || balance.remainingAnnualCents === undefined) {
    return 'No employer match detected yet';
  }
  return `${eur(balance.remainingAnnualCents)} match still available this year`;
}

/** Progress percentage of the annual cap already used (0-100). */
export function usedPercent(balance: MatchBalance | null): number {
  if (!balance || !balance.annualCapCents) return 0;
  const pct = Math.round((balance.usedCents / balance.annualCapCents) * 100);
  return Math.max(0, Math.min(100, pct));
}

/** The CTA verb depends on whether a claim yields a link or a PDF. */
export function claimCtaKind(offer: MatchOffer): 'link' | 'pdf' {
  return offer.integrationLevel === 'MANUAL' ? 'pdf' : 'link';
}

/** True when the offer is worth showing (eligible and a positive match). */
export function isOfferWorthShowing(offer: MatchOffer | null): boolean {
  return !!offer && offer.eligible && (offer.matchCents ?? 0) > 0;
}

const STATUS_TONE: Record<MatchClaimStatus, string> = {
  DETECTED: 'slate',
  OFFERED: 'slate',
  CLAIMED: 'green',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'orange',
  EXPIRED: 'slate',
};

/** A colour tone key for a claim status badge (maps to Tailwind classes in the view). */
export function statusTone(status: MatchClaimStatus): string {
  return STATUS_TONE[status] ?? 'slate';
}
