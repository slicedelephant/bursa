/**
 * E14 ESG/CSRD — pure year-over-year trend builder for board presentations. Groups
 * invested euros, scholar count and female share by calendar year and computes the
 * delta to the previous year. No I/O, no mutation (Constitution IV).
 */

export interface TrendLedgerFact {
  readonly entryType: string;
  readonly amountCents: number;
  readonly createdAt: Date | string;
}

export interface TrendScholarFact {
  readonly gender?: string | null;
  readonly createdAt: Date | string;
}

export interface TrendYear {
  readonly year: number;
  readonly investedEur: number;
  readonly scholarCount: number;
  readonly femaleSharePct: number;
}

export interface TrendDelta {
  readonly year: number;
  readonly investedEurDelta: number;
  readonly scholarCountDelta: number;
  readonly femaleShareDeltaPct: number;
}

export interface TrendReport {
  readonly years: readonly TrendYear[];
  readonly deltas: readonly TrendDelta[];
}

function yearOf(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value);
  return d.getUTCFullYear();
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function buildTrend(
  entries: ReadonlyArray<TrendLedgerFact>,
  scholars: ReadonlyArray<TrendScholarFact>,
): TrendReport {
  const investedByYear: Record<number, number> = {};
  for (const e of entries) {
    if (e.entryType === 'PAYOUT' || e.entryType === 'DISBURSEMENT') {
      const y = yearOf(e.createdAt);
      investedByYear[y] = (investedByYear[y] ?? 0) + e.amountCents;
    }
  }

  const scholarCountByYear: Record<number, number> = {};
  const femaleByYear: Record<number, number> = {};
  const genderedByYear: Record<number, number> = {};
  for (const s of scholars) {
    const y = yearOf(s.createdAt);
    scholarCountByYear[y] = (scholarCountByYear[y] ?? 0) + 1;
    if (s.gender) {
      genderedByYear[y] = (genderedByYear[y] ?? 0) + 1;
      if (s.gender === 'FEMALE') {
        femaleByYear[y] = (femaleByYear[y] ?? 0) + 1;
      }
    }
  }

  const allYears = Array.from(
    new Set([
      ...Object.keys(investedByYear),
      ...Object.keys(scholarCountByYear),
    ]).values(),
  )
    .map(Number)
    .sort((a, b) => a - b);

  const years: TrendYear[] = allYears.map((year) => {
    const gendered = genderedByYear[year] ?? 0;
    const female = femaleByYear[year] ?? 0;
    return {
      year,
      investedEur: round1((investedByYear[year] ?? 0) / 100),
      scholarCount: scholarCountByYear[year] ?? 0,
      femaleSharePct: gendered === 0 ? 0 : round1((female / gendered) * 100),
    };
  });

  const deltas: TrendDelta[] = years.slice(1).map((cur, idx) => {
    const prev = years[idx];
    return {
      year: cur.year,
      investedEurDelta: round1(cur.investedEur - prev.investedEur),
      scholarCountDelta: cur.scholarCount - prev.scholarCount,
      femaleShareDeltaPct: round1(cur.femaleSharePct - prev.femaleSharePct),
    };
  });

  return { years, deltas };
}
