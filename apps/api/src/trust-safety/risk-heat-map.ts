/**
 * E9 Trust-and-Safety — pure risk heat-map by geography.
 *
 * Groups donations, fraud signals and chargebacks by donor country, derives a
 * per-country risk score/level and sorts hottest-first. Missing countries fold
 * into "Unknown". Pure, no I/O, no mutation.
 */

import { clampScore, RiskLevel, scoreToLevel } from './fraud-score';

export interface GeoEntry {
  readonly country?: string | null;
}

export interface HeatMapInput {
  readonly donations: readonly GeoEntry[];
  readonly signals: readonly GeoEntry[];
  readonly chargebacks: readonly GeoEntry[];
}

export interface HeatMapRow {
  readonly country: string;
  readonly donationCount: number;
  readonly signalCount: number;
  readonly chargebackCount: number;
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
}

const UNKNOWN = 'Unknown';

function normalizeCountry(country?: string | null): string {
  const trimmed = (country ?? '').trim();
  return trimmed.length === 0 ? UNKNOWN : trimmed.toUpperCase();
}

interface Bucket {
  donationCount: number;
  signalCount: number;
  chargebackCount: number;
}

function emptyBucket(): Bucket {
  return { donationCount: 0, signalCount: 0, chargebackCount: 0 };
}

export function buildRiskHeatMap(input: HeatMapInput): HeatMapRow[] {
  const buckets = new Map<string, Bucket>();

  const bump = (entries: readonly GeoEntry[], field: keyof Bucket): void => {
    for (const entry of entries) {
      const key = normalizeCountry(entry.country);
      const bucket = buckets.get(key) ?? emptyBucket();
      bucket[field] += 1;
      buckets.set(key, bucket);
    }
  };

  bump(input.donations, 'donationCount');
  bump(input.signals, 'signalCount');
  bump(input.chargebacks, 'chargebackCount');

  const rows: HeatMapRow[] = Array.from(buckets.entries()).map(
    ([country, b]) => {
      const riskScore = clampScore(b.signalCount * 15 + b.chargebackCount * 30);
      return {
        country,
        donationCount: b.donationCount,
        signalCount: b.signalCount,
        chargebackCount: b.chargebackCount,
        riskScore,
        riskLevel: scoreToLevel(riskScore),
      };
    },
  );

  return rows.sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      b.donationCount - a.donationCount ||
      a.country.localeCompare(b.country),
  );
}
