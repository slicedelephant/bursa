/**
 * E12 Ledger — pure builder that turns a money movement into a canonical,
 * immutable ledger entry plus its chain hash. No I/O, no mutation; returns a new
 * object only (Constitution IV). The LedgerService persists the result verbatim.
 */

import { LedgerEntryType } from '@prisma/client';
import { hashEntry } from './ledger-hash';

/** The movement to record, before sequence/prevHash are known. */
export interface MovementInput {
  readonly entryType: LedgerEntryType;
  readonly amountCents: number;
  readonly schoolId: string;
  readonly reason: string;
  readonly currency?: string;
  readonly actorUserId?: string | null;
  readonly refType?: string | null;
  readonly refId?: string | null;
}

/** The chain position assigned by the append, read from the school's last entry. */
export interface ChainPosition {
  readonly sequence: number;
  readonly prevHash: string;
  /** Fixed creation timestamp, so the hash is reproducible from stored fields. */
  readonly createdAt: Date;
}

/** A fully-built entry ready to persist (matches the Prisma LedgerEntry shape). */
export interface BuiltLedgerEntry {
  readonly sequence: number;
  readonly entryType: LedgerEntryType;
  readonly amountCents: number;
  readonly currency: string;
  readonly schoolId: string;
  readonly actorUserId: string | null;
  readonly reason: string;
  readonly refType: string | null;
  readonly refId: string | null;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly createdAt: Date;
}

/**
 * Build the next ledger entry for a school from a movement and the chain position
 * of its predecessor. The entry's hash is computed over the canonical fields so
 * the chain stays verifiable.
 */
export function buildLedgerEntry(
  movement: MovementInput,
  position: ChainPosition,
): BuiltLedgerEntry {
  const currency = movement.currency ?? 'EUR';
  const actorUserId = movement.actorUserId ?? null;
  const refType = movement.refType ?? null;
  const refId = movement.refId ?? null;
  const createdAtIso = position.createdAt.toISOString();

  const entryHash = hashEntry({
    sequence: position.sequence,
    entryType: movement.entryType,
    amountCents: movement.amountCents,
    currency,
    schoolId: movement.schoolId,
    actorUserId,
    reason: movement.reason,
    refType,
    refId,
    createdAt: createdAtIso,
    prevHash: position.prevHash,
  });

  return {
    sequence: position.sequence,
    entryType: movement.entryType,
    amountCents: movement.amountCents,
    currency,
    schoolId: movement.schoolId,
    actorUserId,
    reason: movement.reason,
    refType,
    refId,
    prevHash: position.prevHash,
    entryHash,
    createdAt: position.createdAt,
  };
}

/** The chain position for the first entry of a school (genesis). */
export function genesisPosition(createdAt: Date): ChainPosition {
  return { sequence: 1, prevHash: '', createdAt };
}

/** The next chain position after a previous entry. */
export function nextPosition(
  previous: { sequence: number; entryHash: string },
  createdAt: Date,
): ChainPosition {
  return {
    sequence: previous.sequence + 1,
    prevHash: previous.entryHash,
    createdAt,
  };
}
