/**
 * E12 Reconciliation — pure double-entry accounting mapper. Maps each school
 * payout to a balanced pair of journal lines (debit "Tuition Disbursements",
 * credit "Bank/Clearing") with GL codes, for QuickBooks/Wave/NetSuite import. No
 * I/O, no mutation (Constitution IV).
 *
 * NOT a push into real accounting software — see the spec's Out of Scope. This is
 * a journal-entry CSV for manual import only.
 */

export const GL_DISBURSEMENT_DEBIT = '5000'; // Tuition Disbursements (expense)
export const GL_BANK_CREDIT = '1000'; // Bank / Clearing (asset)

export const GL_DISBURSEMENT_NAME = 'Tuition Disbursements';
export const GL_BANK_NAME = 'Bank / Clearing';

export interface JournalPayoutInput {
  readonly payoutId: string;
  readonly campaignTitle: string;
  readonly amountCents: number;
  readonly sentAt: Date | string | null;
}

export interface JournalLine {
  readonly date: string;
  readonly journalRef: string;
  readonly account: string;
  readonly accountName: string;
  readonly debitCents: number;
  readonly creditCents: number;
  readonly memo: string;
}

function isoDate(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** Build the two balanced journal lines for one payout. */
export function payoutToJournalLines(
  payout: JournalPayoutInput,
): JournalLine[] {
  const date = isoDate(payout.sentAt);
  const journalRef = `PO-${payout.payoutId}`;
  const memo = `Tuition disbursement — ${payout.campaignTitle}`;
  return [
    {
      date,
      journalRef,
      account: GL_DISBURSEMENT_DEBIT,
      accountName: GL_DISBURSEMENT_NAME,
      debitCents: payout.amountCents,
      creditCents: 0,
      memo,
    },
    {
      date,
      journalRef,
      account: GL_BANK_CREDIT,
      accountName: GL_BANK_NAME,
      debitCents: 0,
      creditCents: payout.amountCents,
      memo,
    },
  ];
}

export interface JournalResult {
  readonly lines: readonly JournalLine[];
  readonly totalDebitCents: number;
  readonly totalCreditCents: number;
  /** True when total debits equal total credits (a valid double-entry set). */
  readonly balanced: boolean;
}

/** Build the full balanced journal for a list of payouts. */
export function buildJournal(
  payouts: readonly JournalPayoutInput[],
): JournalResult {
  const lines = payouts.flatMap(payoutToJournalLines);
  const totalDebitCents = lines.reduce((s, l) => s + l.debitCents, 0);
  const totalCreditCents = lines.reduce((s, l) => s + l.creditCents, 0);
  return {
    lines,
    totalDebitCents,
    totalCreditCents,
    balanced: totalDebitCents === totalCreditCents,
  };
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise the journal to a CSV for accounting-software import. */
export function journalToCsv(result: JournalResult): string {
  const header = 'Date,Journal,Account,Account Name,Debit,Credit,Memo';
  const rows = result.lines.map((l) =>
    [
      l.date,
      cell(l.journalRef),
      l.account,
      cell(l.accountName),
      eur(l.debitCents),
      eur(l.creditCents),
      cell(l.memo),
    ].join(','),
  );
  return [header, ...rows].join('\n') + '\n';
}
