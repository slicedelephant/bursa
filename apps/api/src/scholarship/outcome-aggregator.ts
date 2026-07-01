/**
 * E19 — Scholarship Program Manager: pure outcome aggregator.
 *
 * Summarizes scholar outcomes for the impact report (enrolled / graduated /
 * working counts, retention + graduation rates, alumni count). Diversity metrics
 * come from the E14 aggregator, not from here. No I/O; returns new objects.
 */

import { ScholarStatus } from './scholar-status';

export interface ScholarOutcome {
  readonly status: ScholarStatus;
  readonly alumniNetwork: boolean;
}

export interface ProgramOutcome {
  readonly total: number;
  readonly awarded: number;
  readonly enrolled: number;
  readonly graduated: number;
  readonly working: number;
  readonly withdrawn: number;
  readonly alumni: number;
  readonly retentionRate: number; // % of awarded scholars not withdrawn
  readonly graduationRate: number; // % of awarded scholars graduated or working
}

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;
}

/** Counts scholars per status and derives retention + graduation rates. */
export function buildProgramOutcome(
  scholars: readonly ScholarOutcome[],
): ProgramOutcome {
  const total = scholars.length;
  const count = (s: ScholarStatus) => scholars.filter((x) => x.status === s).length;

  const awarded = count('AWARDED');
  const enrolled = count('ENROLLED');
  const graduated = count('GRADUATED');
  const working = count('WORKING');
  const withdrawn = count('WITHDRAWN');
  const alumni = scholars.filter((s) => s.alumniNetwork).length;

  const graduatedOrWorking = graduated + working;
  const notWithdrawn = total - withdrawn;

  return {
    total,
    awarded,
    enrolled,
    graduated,
    working,
    withdrawn,
    alumni,
    retentionRate: pct(notWithdrawn, total),
    graduationRate: pct(graduatedOrWorking, total),
  };
}
