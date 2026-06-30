/**
 * E12 Ledger — pure hash-chain integrity helper (a reusable money primitive E14
 * will build on). Computes a deterministic SHA-256 over a canonical, stably
 * ordered serialisation of an entry's fields, and verifies a chain of entries
 * (sequence monotonicity + prevHash linkage + hash recomputation).
 *
 * No I/O beyond Node's `crypto` hash; no mutation. Building new values only
 * (Constitution IV). The hash makes the append-only ledger tamper-evident: any
 * after-the-fact change to a field breaks the recomputed hash and the chain.
 */

import { createHash } from 'crypto';
import { LedgerEntryType } from '@prisma/client';

/** The fields that are hashed for an entry (everything bar the hash itself). */
export interface LedgerHashInput {
  readonly sequence: number;
  readonly entryType: LedgerEntryType;
  readonly amountCents: number;
  readonly currency: string;
  readonly schoolId: string;
  readonly actorUserId: string | null;
  readonly reason: string;
  readonly refType: string | null;
  readonly refId: string | null;
  /** ISO timestamp of the entry (string for stable, reproducible hashing). */
  readonly createdAt: string;
  /** The predecessor's entryHash; "" for the genesis entry of a school. */
  readonly prevHash: string;
}

/**
 * Canonical serialisation: a stably key-sorted `key=value` join. Keeps the hash
 * deterministic and reproducible regardless of object key order. Null is encoded
 * as the empty string so it never collides with a real value structurally.
 */
export function canonicalize(input: LedgerHashInput): string {
  const fields: Record<string, string> = {
    amountCents: String(input.amountCents),
    createdAt: input.createdAt,
    currency: input.currency,
    entryType: input.entryType,
    actorUserId: input.actorUserId ?? '',
    prevHash: input.prevHash,
    reason: input.reason,
    refId: input.refId ?? '',
    refType: input.refType ?? '',
    schoolId: input.schoolId,
    sequence: String(input.sequence),
  };
  return Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('|');
}

/** Deterministic SHA-256 (hex) over the canonical serialisation of an entry. */
export function hashEntry(input: LedgerHashInput): string {
  return createHash('sha256').update(canonicalize(input)).digest('hex');
}

/** A persisted entry shape for chain verification. */
export interface ChainEntry extends LedgerHashInput {
  readonly entryHash: string;
}

export interface ChainVerification {
  readonly valid: boolean;
  readonly checkedCount: number;
  /** The sequence at which the chain first breaks, or null when valid/empty. */
  readonly brokenAtSequence: number | null;
}

/**
 * Verify a school's ledger chain. Entries must be ordered by ascending sequence.
 * Checks: (1) the genesis prevHash is "", (2) each prevHash equals the previous
 * entry's entryHash, (3) sequence increases by exactly 1, (4) the stored
 * entryHash matches the recomputed hash. Returns where it first breaks.
 */
export function verifyChain(entries: readonly ChainEntry[]): ChainVerification {
  let prevHash = '';
  let prevSequence: number | null = null;

  for (const entry of entries) {
    const sequenceOk =
      prevSequence === null ? true : entry.sequence === prevSequence + 1;
    const linkOk = entry.prevHash === prevHash;
    const recomputed = hashEntry({ ...entry, prevHash });
    const hashOk = recomputed === entry.entryHash;

    if (!sequenceOk || !linkOk || !hashOk) {
      return {
        valid: false,
        checkedCount: entries.length,
        brokenAtSequence: entry.sequence,
      };
    }

    prevHash = entry.entryHash;
    prevSequence = entry.sequence;
  }

  return {
    valid: true,
    checkedCount: entries.length,
    brokenAtSequence: null,
  };
}
