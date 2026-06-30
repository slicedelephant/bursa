// Pure referral-stats calculator (E15). Turns the raw invited/donated/active counts
// into the donor/fundraiser tracking dashboard: conversion rate, a simple viral
// coefficient, and the human "14 invited, 5 donated, 2 active" label. No I/O; returns
// new values; never mutates inputs.

export interface ReferralStatsInput {
  /** People reached by the referral/advocate link (invites + tracked clicks). */
  readonly invited: number;
  /** Of those, how many made a counted donation. */
  readonly donated: number;
  /** Of the donors, how many are still active (e.g. recurring / repeat). */
  readonly active: number;
}

export interface ReferralStats {
  readonly invited: number;
  readonly donated: number;
  readonly active: number;
  /** donated / invited as a percentage, one decimal (0 when nobody was invited). */
  readonly conversionPct: number;
  /** donated / invited, two decimals — a simple viral-coefficient proxy. */
  readonly viralCoefficient: number;
  readonly label: string;
}

function nonNegInt(value: number): number {
  return Math.max(0, Math.floor(value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeReferralStats(input: ReferralStatsInput): ReferralStats {
  const invited = nonNegInt(input.invited);
  const donatedRaw = nonNegInt(input.donated);
  // Donations cannot exceed invites; clamp to keep rates sane.
  const donated = Math.min(donatedRaw, invited);
  const active = Math.min(nonNegInt(input.active), donated);

  const conversionPct = invited === 0 ? 0 : round((donated / invited) * 100, 1);
  const viralCoefficient = invited === 0 ? 0 : round(donated / invited, 2);

  return {
    invited,
    donated,
    active,
    conversionPct,
    viralCoefficient,
    label: `${invited} invited, ${donated} donated, ${active} active`,
  };
}
