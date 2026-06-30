/**
 * E12 Reconciliation — pure matcher. Matches system payouts against bank-feed
 * transactions and classifies each payout as MATCHED / PENDING / UNMATCHED, plus
 * surfaces bank transactions with no system payout (orphans). No I/O, no mutation;
 * returns new values only (Constitution IV).
 *
 * Match rule (a payout matches a bank transaction when):
 *   - their references are equal (exact, case-insensitive, trimmed), OR
 *   - same amount AND posted within MATCH_DATE_WINDOW_HOURS of the payout's sentAt.
 *
 * Classification (no bank match):
 *   - PENDING   — payout SENT, sent <= STALE_AFTER_HOURS ago
 *   - UNMATCHED — payout SENT, sent  > STALE_AFTER_HOURS ago (also a stale alert)
 *   - PENDING   — payout still PENDING (not yet sent to the bank)
 */

export const STALE_AFTER_HOURS = 48;
export const MATCH_DATE_WINDOW_HOURS = 72;

export type ReconciliationRowStatus = 'MATCHED' | 'PENDING' | 'UNMATCHED';

export interface PayoutForMatch {
  readonly payoutId: string;
  readonly schoolId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reference: string;
  readonly status: 'PENDING' | 'SENT' | 'CONFIRMED';
  readonly sentAt: Date | null;
}

export interface BankTxForMatch {
  readonly externalId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reference: string | null;
  readonly postedAt: Date;
}

export interface MatchedRow {
  readonly payout: PayoutForMatch;
  readonly status: ReconciliationRowStatus;
  readonly bankTx: BankTxForMatch | null;
}

export interface MatchResult {
  readonly rows: readonly MatchedRow[];
  readonly unmatchedBankTx: readonly BankTxForMatch[];
}

function normaliseRef(ref: string | null | undefined): string {
  return (ref ?? '').trim().toLowerCase();
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

/** Does a bank transaction match a payout by reference or amount+date window? */
function isMatch(payout: PayoutForMatch, tx: BankTxForMatch): boolean {
  const payoutRef = normaliseRef(payout.reference);
  const txRef = normaliseRef(tx.reference);
  if (payoutRef !== '' && payoutRef === txRef) return true;

  if (tx.amountCents !== payout.amountCents) return false;
  if (!payout.sentAt) return false;
  return hoursBetween(payout.sentAt, tx.postedAt) <= MATCH_DATE_WINDOW_HOURS;
}

function classifyUnmatched(
  payout: PayoutForMatch,
  now: Date,
): ReconciliationRowStatus {
  if (payout.status === 'SENT' || payout.status === 'CONFIRMED') {
    if (payout.sentAt && hoursBetween(now, payout.sentAt) > STALE_AFTER_HOURS) {
      return 'UNMATCHED';
    }
    return 'PENDING';
  }
  // Not yet sent to the bank.
  return 'PENDING';
}

/**
 * Reconcile payouts against bank transactions. Each bank transaction is consumed
 * by at most one payout (first match wins by payout order), so an over-count of
 * matches cannot occur.
 */
export function reconcile(
  payouts: readonly PayoutForMatch[],
  bankTx: readonly BankTxForMatch[],
  now: Date = new Date(),
): MatchResult {
  const consumed = new Set<string>();
  const rows: MatchedRow[] = [];

  for (const payout of payouts) {
    const match = bankTx.find(
      (tx) => !consumed.has(tx.externalId) && isMatch(payout, tx),
    );
    if (match) {
      consumed.add(match.externalId);
      rows.push({ payout, status: 'MATCHED', bankTx: match });
    } else {
      rows.push({
        payout,
        status: classifyUnmatched(payout, now),
        bankTx: null,
      });
    }
  }

  const unmatchedBankTx = bankTx.filter((tx) => !consumed.has(tx.externalId));
  return { rows, unmatchedBankTx };
}
