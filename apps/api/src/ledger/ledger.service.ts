import { Injectable } from '@nestjs/common';
import { LedgerEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildLedgerEntry,
  genesisPosition,
  MovementInput,
  nextPosition,
} from './ledger-entry';
import { buildLedgerView, LedgerView } from './ledger-view';

/**
 * E12 — Append-only transaction ledger service. A first-class, reusable money
 * primitive: E14 (CSRD audit-trail) will read from it without changing it.
 *
 * It exposes ONLY `append()` and read methods — there is deliberately no update
 * or delete method anywhere on this service. That is the enforced append-only
 * invariant (Constitution IV). Each append reads the school's last entry inside
 * a transaction to assign the next sequence + prevHash, keeping the hash chain
 * intact under concurrent appends.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append one immutable entry for a movement. Reads the school's last entry to
   * derive the chain position, then creates the row — all in one transaction so
   * the (schoolId, sequence) unique index and the hash chain stay consistent.
   */
  async append(
    movement: MovementInput,
    at: Date = new Date(),
  ): Promise<LedgerEntry> {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.ledgerEntry.findFirst({
        where: { schoolId: movement.schoolId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true, entryHash: true },
      });

      const position = previous
        ? nextPosition(previous, at)
        : genesisPosition(at);

      const built = buildLedgerEntry(movement, position);

      return tx.ledgerEntry.create({
        data: {
          sequence: built.sequence,
          entryType: built.entryType,
          amountCents: built.amountCents,
          currency: built.currency,
          schoolId: built.schoolId,
          actorUserId: built.actorUserId,
          reason: built.reason,
          refType: built.refType,
          refId: built.refId,
          prevHash: built.prevHash,
          entryHash: built.entryHash,
          createdAt: built.createdAt,
        },
      });
    });
  }

  /** List a school's ledger entries, newest first (read-only). */
  async listForSchool(schoolId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { schoolId },
      orderBy: { sequence: 'desc' },
    });
  }

  /**
   * List ledger entries across all schools for read-only reporting (E14 CSRD).
   * Ordered by (school, sequence) so per-school chains stay contiguous. Optional
   * date window. Read-only — the append-only invariant is untouched.
   */
  async listAllForReporting(window?: {
    from?: Date;
    to?: Date;
  }): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where:
        window?.from || window?.to
          ? { createdAt: { gte: window.from, lte: window.to } }
          : undefined,
      orderBy: [{ schoolId: 'asc' }, { sequence: 'asc' }],
    });
  }

  /** Build the full ledger view (entries + chain integrity) for a school. */
  async viewForSchool(schoolId: string): Promise<LedgerView> {
    const rows = await this.listForSchool(schoolId);
    return buildLedgerView(schoolId, rows);
  }
}
