/**
 * E14 ESG/CSRD — pure builder of the neutral `EsgAggregate` from read-only ledger
 * entries, diversity profiles and ESG tags. This is the single, standard-agnostic
 * fact base that the standard mapper projects onto GRI/CSRD/SASB/SDG. No I/O, no
 * mutation (Constitution IV). The ledger is read, never written.
 */

import { EsgCategory, LedgerEntryType } from '@prisma/client';
import { categoryDistribution } from './esg-category';
import {
  aggregateDiversity,
  DiversityAggregate,
  DiversityProfileInput,
} from './diversity-aggregator';

/** A read-only view of a ledger entry, as needed for reporting. */
export interface LedgerEntryFact {
  readonly entryType: LedgerEntryType;
  readonly amountCents: number;
  readonly createdAt: Date | string;
}

export interface EsgAggregateInput {
  readonly entries: ReadonlyArray<LedgerEntryFact>;
  readonly profiles: ReadonlyArray<DiversityProfileInput>;
  readonly tags: ReadonlyArray<{ category: EsgCategory }>;
  readonly refYear?: number;
}

export interface EsgAggregate {
  /** Total euros (cents) moved toward schools (PAYOUT + DISBURSEMENT). */
  readonly investedCents: number;
  /** Total donation euros (cents) received (DONATION). */
  readonly donatedCents: number;
  readonly donationCount: number;
  readonly payoutCount: number;
  readonly disbursementCount: number;
  readonly diversity: DiversityAggregate;
  readonly categoryCounts: Record<EsgCategory, number>;
  readonly taggedCount: number;
}

export function buildEsgAggregate(input: EsgAggregateInput): EsgAggregate {
  const refYear = input.refYear ?? new Date().getFullYear();

  let investedCents = 0;
  let donatedCents = 0;
  let donationCount = 0;
  let payoutCount = 0;
  let disbursementCount = 0;

  for (const e of input.entries) {
    switch (e.entryType) {
      case 'DONATION':
        donatedCents += e.amountCents;
        donationCount += 1;
        break;
      case 'PAYOUT':
        investedCents += e.amountCents;
        payoutCount += 1;
        break;
      case 'DISBURSEMENT':
        investedCents += e.amountCents;
        disbursementCount += 1;
        break;
    }
  }

  return {
    investedCents,
    donatedCents,
    donationCount,
    payoutCount,
    disbursementCount,
    diversity: aggregateDiversity(input.profiles, refYear),
    categoryCounts: categoryDistribution(input.tags),
    taggedCount: input.tags.length,
  };
}
