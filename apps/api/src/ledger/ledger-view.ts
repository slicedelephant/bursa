/**
 * E12 Ledger — pure DB-row → API-view mapper. Shapes LedgerEntry rows into the
 * stable `LedgerView` from the contract, and folds the chain verification into an
 * `integrity` summary. No I/O, no mutation (Constitution IV).
 */

import { LedgerEntry, LedgerEntryType } from '@prisma/client';
import { ChainEntry, verifyChain } from './ledger-hash';

export interface LedgerEntryView {
  sequence: number;
  entryType: LedgerEntryType;
  amountCents: number;
  currency: string;
  reason: string;
  refType: string | null;
  refId: string | null;
  entryHash: string;
  createdAt: string;
}

export interface LedgerIntegrityView {
  valid: boolean;
  checkedCount: number;
  brokenAtSequence: number | null;
}

export interface LedgerView {
  schoolId: string;
  integrity: LedgerIntegrityView;
  entries: LedgerEntryView[];
}

/** Map a persisted row to the API view shape. */
export function toLedgerEntryView(row: LedgerEntry): LedgerEntryView {
  return {
    sequence: row.sequence,
    entryType: row.entryType,
    amountCents: row.amountCents,
    currency: row.currency,
    reason: row.reason,
    refType: row.refType ?? null,
    refId: row.refId ?? null,
    entryHash: row.entryHash,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Convert a persisted row to the chain-verification shape. */
function toChainEntry(row: LedgerEntry): ChainEntry {
  return {
    sequence: row.sequence,
    entryType: row.entryType,
    amountCents: row.amountCents,
    currency: row.currency,
    schoolId: row.schoolId,
    actorUserId: row.actorUserId ?? null,
    reason: row.reason,
    refType: row.refType ?? null,
    refId: row.refId ?? null,
    createdAt: row.createdAt.toISOString(),
    prevHash: row.prevHash,
    entryHash: row.entryHash,
  };
}

/**
 * Build the full ledger view for a school. `rows` may arrive newest-first (as the
 * API lists them); the integrity check runs on an ascending-sequence copy so the
 * chain is verified in order, while the returned entries preserve the input order.
 */
export function buildLedgerView(
  schoolId: string,
  rows: readonly LedgerEntry[],
): LedgerView {
  const ascending = [...rows].sort((a, b) => a.sequence - b.sequence);
  const integrity = verifyChain(ascending.map(toChainEntry));
  return {
    schoolId,
    integrity,
    entries: rows.map(toLedgerEntryView),
  };
}
