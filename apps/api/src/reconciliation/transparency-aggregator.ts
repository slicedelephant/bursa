/**
 * E12 Reconciliation — pure public-transparency aggregator. Folds a school's
 * donations and payouts into PII-free aggregates for embedding on a school's
 * website (total raised, total paid out, avg donation, donor geography). No
 * individual donors, names or IDs are exposed — aggregates only. No I/O, no
 * mutation (Constitution IV).
 */

export interface TransparencyDonationInput {
  readonly amountCents: number;
  readonly donorCountry?: string | null;
  /** Soft campaign reference, used only to count distinct supported students. */
  readonly campaignId: string;
}

export interface TransparencyPayoutInput {
  readonly amountCents: number;
}

export interface DonorGeographyAggregate {
  readonly country: string;
  readonly donationCount: number;
  readonly amountCents: number;
}

export interface TransparencyAggregate {
  readonly totalRaisedCents: number;
  readonly totalPaidOutCents: number;
  readonly donationCount: number;
  readonly avgDonationCents: number;
  readonly studentsSupported: number;
  readonly donorGeography: readonly DonorGeographyAggregate[];
}

function donorGeography(
  donations: readonly TransparencyDonationInput[],
): DonorGeographyAggregate[] {
  const byCountry = new Map<
    string,
    { donationCount: number; amountCents: number }
  >();
  for (const d of donations) {
    const country = d.donorCountry?.trim() || 'Unknown';
    const prev = byCountry.get(country) ?? { donationCount: 0, amountCents: 0 };
    byCountry.set(country, {
      donationCount: prev.donationCount + 1,
      amountCents: prev.amountCents + d.amountCents,
    });
  }
  return [...byCountry.entries()]
    .map(([country, agg]) => ({ country, ...agg }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents || a.country.localeCompare(b.country),
    );
}

/** Aggregate a school's donations + payouts into PII-free public statistics. */
export function aggregateTransparency(
  donations: readonly TransparencyDonationInput[],
  payouts: readonly TransparencyPayoutInput[],
): TransparencyAggregate {
  const totalRaisedCents = donations.reduce((s, d) => s + d.amountCents, 0);
  const totalPaidOutCents = payouts.reduce((s, p) => s + p.amountCents, 0);
  const donationCount = donations.length;
  const avgDonationCents =
    donationCount === 0 ? 0 : Math.round(totalRaisedCents / donationCount);
  const studentsSupported = new Set(donations.map((d) => d.campaignId)).size;

  return {
    totalRaisedCents,
    totalPaidOutCents,
    donationCount,
    avgDonationCents,
    studentsSupported,
    donorGeography: donorGeography(donations),
  };
}
