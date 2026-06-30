/**
 * E14 ESG/CSRD — pure mapper from the neutral `EsgAggregate` onto a chosen reporting
 * standard's metrics (GRI 2024 / CSRD-ESRS / SASB / UN SDG). The mapping is
 * ILLUSTRATIVE — it shows the shape of a standards-aligned disclosure fed from the
 * immutable ledger, not a certified disclosure schema. No I/O, no mutation
 * (Constitution IV).
 */

import { ReportStandard } from '@prisma/client';
import { EsgAggregate } from './esg-aggregate';

export interface MappedMetric {
  /** Standard-specific code (e.g. "GRI 201-1", "ESRS S1", "SASB SC", "SDG 4"). */
  readonly code: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly note: string;
}

const STANDARD_LABELS: Record<ReportStandard, string> = {
  GRI_2024: 'GRI Standards 2024',
  CSRD_ESRS: 'CSRD / ESRS',
  SASB: 'SASB',
  UN_SDG: 'UN Sustainable Development Goals',
};

export function reportStandardLabel(standard: ReportStandard): string {
  return STANDARD_LABELS[standard];
}

export function isReportStandard(value: unknown): value is ReportStandard {
  return (
    value === 'GRI_2024' ||
    value === 'CSRD_ESRS' ||
    value === 'SASB' ||
    value === 'UN_SDG'
  );
}

/** Parse a standard at the boundary; throws (→ 400) for an invalid value. */
export function parseReportStandard(value: unknown): ReportStandard {
  if (!isReportStandard(value)) {
    throw new Error('standard must be a valid ReportStandard');
  }
  return value;
}

function eur(cents: number): number {
  return Math.round(cents) / 100;
}

function griMetrics(a: EsgAggregate): MappedMetric[] {
  const d = a.diversity;
  return [
    {
      code: 'GRI 201-1',
      label: 'Direct economic value distributed',
      value: eur(a.investedCents),
      unit: 'EUR',
      note: `From ${a.payoutCount + a.disbursementCount} ledger payout/disbursement entries`,
    },
    {
      code: 'GRI 405-1',
      label: 'Diversity of recipients (female share)',
      value: d.femaleSharePct,
      unit: '% female',
      note: `${d.genderCounts.FEMALE} of ${d.scholarCount} scholars`,
    },
    {
      code: 'GRI 413-1',
      label: 'Operations with local community engagement (countries reached)',
      value: d.countriesReached,
      unit: 'countries',
      note: `${d.scholarCount} scholars supported`,
    },
  ];
}

function csrdMetrics(a: EsgAggregate): MappedMetric[] {
  const d = a.diversity;
  return [
    {
      code: 'ESRS S1',
      label: 'Own workforce / beneficiaries — gender diversity',
      value: d.femaleSharePct,
      unit: '% female',
      note: `${d.scholarCount} scholars funded`,
    },
    {
      code: 'ESRS S3',
      label: 'Affected communities — geographic reach',
      value: d.countriesReached,
      unit: 'countries',
      note: `First-generation share ${d.firstGenSharePct}%`,
    },
    {
      code: 'ESRS G1',
      label: 'Business conduct — auditable funds distributed',
      value: eur(a.investedCents),
      unit: 'EUR',
      note: `${a.taggedCount} ledger entries ESG-tagged`,
    },
  ];
}

function sasbMetrics(a: EsgAggregate): MappedMetric[] {
  const d = a.diversity;
  return [
    {
      code: 'SASB FN-CB-240',
      label: 'Access & affordability — tuition funded',
      value: eur(a.investedCents),
      unit: 'EUR',
      note: `${d.scholarCount} scholars`,
    },
    {
      code: 'SASB SC-DR',
      label: 'Social capital — diversity of recipients',
      value: d.femaleSharePct,
      unit: '% female',
      note: `${d.countriesReached} countries reached`,
    },
  ];
}

function sdgMetrics(a: EsgAggregate): MappedMetric[] {
  const d = a.diversity;
  return [
    {
      code: 'SDG 1',
      label: 'No Poverty — tuition funding distributed',
      value: eur(a.investedCents),
      unit: 'EUR',
      note: `${a.payoutCount + a.disbursementCount} disbursements`,
    },
    {
      code: 'SDG 4',
      label: 'Quality Education — scholars supported',
      value: d.scholarCount,
      unit: 'scholars',
      note: `${a.categoryCounts.QUALITY_EDUCATION} entries tagged Quality Education`,
    },
    {
      code: 'SDG 5',
      label: 'Gender Equality — female scholars funded',
      value: d.femaleSharePct,
      unit: '% female',
      note: `${d.genderCounts.FEMALE} of ${d.scholarCount} scholars`,
    },
    {
      code: 'SDG 10',
      label: 'Reduced Inequalities — first-gen & geographic reach',
      value: d.firstGenSharePct,
      unit: '% first-generation',
      note: `${d.countriesReached} countries reached`,
    },
  ];
}

export function mapToStandard(
  standard: ReportStandard,
  aggregate: EsgAggregate,
): MappedMetric[] {
  switch (standard) {
    case 'GRI_2024':
      return griMetrics(aggregate);
    case 'CSRD_ESRS':
      return csrdMetrics(aggregate);
    case 'SASB':
      return sasbMetrics(aggregate);
    case 'UN_SDG':
      return sdgMetrics(aggregate);
  }
}
