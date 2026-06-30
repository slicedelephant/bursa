/**
 * E14 ESG/CSRD — pure diversity aggregation over scholar profiles. Turns optional,
 * privacy-light diversity fields into reportable distributions and shares. No I/O,
 * no mutation (Constitution IV). Only captured (non-null) values count toward a
 * field's share; absence is surfaced separately by the data-quality core.
 */

import { Gender } from '@prisma/client';
import { ageBand, AgeBand } from './age-band';

export interface DiversityProfileInput {
  readonly gender?: Gender | null;
  readonly birthYear?: number | null;
  readonly country?: string | null;
  readonly firstGen?: boolean | null;
}

export interface DiversityAggregate {
  readonly scholarCount: number;
  readonly genderCounts: Record<Gender, number>;
  /** Female share of scholars whose gender is captured (0 when none captured). */
  readonly femaleSharePct: number;
  readonly countryCounts: Record<string, number>;
  readonly countriesReached: number;
  readonly ageBandCounts: Record<AgeBand, number>;
  /** First-generation share of scholars whose firstGen is captured. */
  readonly firstGenSharePct: number;
}

const GENDERS: readonly Gender[] = [
  'FEMALE',
  'MALE',
  'NON_BINARY',
  'UNDISCLOSED',
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sharePct(part: number, whole: number): number {
  return whole === 0 ? 0 : round1((part / whole) * 100);
}

export function aggregateDiversity(
  profiles: ReadonlyArray<DiversityProfileInput>,
  refYear: number = new Date().getFullYear(),
): DiversityAggregate {
  const genderCounts = GENDERS.reduce(
    (acc, g) => ({ ...acc, [g]: 0 }),
    {} as Record<Gender, number>,
  );
  const ageBandCounts: Record<AgeBand, number> = {
    UNDER_25: 0,
    '25_29': 0,
    '30_34': 0,
    '35_PLUS': 0,
    UNKNOWN: 0,
  };
  const countryCounts: Record<string, number> = {};

  let genderCaptured = 0;
  let firstGenCaptured = 0;
  let firstGenTrue = 0;

  for (const p of profiles) {
    if (p.gender) {
      genderCounts[p.gender] = genderCounts[p.gender] + 1;
      genderCaptured += 1;
    }
    const band = ageBand(p.birthYear, refYear);
    ageBandCounts[band] = ageBandCounts[band] + 1;
    if (p.country) {
      countryCounts[p.country] = (countryCounts[p.country] ?? 0) + 1;
    }
    if (p.firstGen !== null && p.firstGen !== undefined) {
      firstGenCaptured += 1;
      if (p.firstGen) firstGenTrue += 1;
    }
  }

  return {
    scholarCount: profiles.length,
    genderCounts,
    femaleSharePct: sharePct(genderCounts.FEMALE, genderCaptured),
    countryCounts,
    countriesReached: Object.keys(countryCounts).length,
    ageBandCounts,
    firstGenSharePct: sharePct(firstGenTrue, firstGenCaptured),
  };
}
