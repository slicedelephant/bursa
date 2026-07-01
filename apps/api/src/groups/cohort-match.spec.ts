import { splitCohortMatch } from './cohort-match';

const subs = [
  { campaignId: 'c_amara', gapCents: 300_000 },
  { campaignId: 'c_ben', gapCents: 300_000 },
];

describe('splitCohortMatch (GAP mode, default)', () => {
  it('splits proportionally to the remaining gaps', () => {
    const result = splitCohortMatch({
      subCampaigns: subs,
      totalCents: 600_000,
    });
    expect(result.allocations).toEqual([
      { campaignId: 'c_amara', amountCents: 300_000 },
      { campaignId: 'c_ben', amountCents: 300_000 },
    ]);
    expect(result.allocatedCents).toBe(600_000);
  });

  it('never over-funds past the combined gap', () => {
    const result = splitCohortMatch({
      subCampaigns: subs,
      totalCents: 1_000_000,
    });
    expect(result.allocatedCents).toBe(600_000); // capped at total gap
    expect(result.allocations.every((a) => a.amountCents <= 300_000)).toBe(
      true,
    );
  });

  it('weights larger gaps more', () => {
    const result = splitCohortMatch({
      subCampaigns: [
        { campaignId: 'c_a', gapCents: 900_000 },
        { campaignId: 'c_b', gapCents: 100_000 },
      ],
      totalCents: 500_000,
    });
    const a = result.allocations.find((x) => x.campaignId === 'c_a')!;
    const b = result.allocations.find((x) => x.campaignId === 'c_b')!;
    expect(a.amountCents).toBe(450_000);
    expect(b.amountCents).toBe(50_000);
  });

  it('assigns a rounding remainder deterministically and sums exactly', () => {
    const result = splitCohortMatch({
      subCampaigns: [
        { campaignId: 'c_a', gapCents: 1000 },
        { campaignId: 'c_b', gapCents: 1000 },
        { campaignId: 'c_c', gapCents: 1000 },
      ],
      totalCents: 1000,
    });
    const sum = result.allocations.reduce((s, a) => s + a.amountCents, 0);
    expect(sum).toBe(1000);
    expect(result.allocatedCents).toBe(1000);
    // 1000 / 3 = 333 each, remainder 1 → id-sorted first campaign gets it
    expect(
      result.allocations.find((a) => a.campaignId === 'c_a')!.amountCents,
    ).toBe(334);
  });

  it('returns nothing when all gaps are 0', () => {
    const result = splitCohortMatch({
      subCampaigns: [{ campaignId: 'c_a', gapCents: 0 }],
      totalCents: 500,
    });
    expect(result.allocations).toEqual([]);
    expect(result.allocatedCents).toBe(0);
  });
});

describe('splitCohortMatch (EVEN mode)', () => {
  it('splits the total evenly', () => {
    const result = splitCohortMatch({
      subCampaigns: subs,
      totalCents: 600_000,
      mode: 'EVEN',
    });
    expect(result.allocations).toEqual([
      { campaignId: 'c_amara', amountCents: 300_000 },
      { campaignId: 'c_ben', amountCents: 300_000 },
    ]);
  });

  it('hands the even-split remainder to the first campaign and sums exactly', () => {
    const result = splitCohortMatch({
      subCampaigns: [
        { campaignId: 'c_a', gapCents: 0 },
        { campaignId: 'c_b', gapCents: 0 },
        { campaignId: 'c_c', gapCents: 0 },
      ],
      totalCents: 1000,
      mode: 'EVEN',
    });
    const sum = result.allocations.reduce((s, a) => s + a.amountCents, 0);
    expect(sum).toBe(1000);
    expect(result.allocations[0].campaignId).toBe('c_a');
    expect(result.allocations[0].amountCents).toBe(334);
  });
});

describe('splitCohortMatch edge cases', () => {
  it('returns nothing for no sub-campaigns', () => {
    expect(
      splitCohortMatch({ subCampaigns: [], totalCents: 500 }).allocations,
    ).toEqual([]);
  });

  it('returns nothing for a zero total', () => {
    expect(
      splitCohortMatch({ subCampaigns: subs, totalCents: 0 }).allocations,
    ).toEqual([]);
  });

  it('clamps a negative total to 0', () => {
    expect(
      splitCohortMatch({ subCampaigns: subs, totalCents: -100 }).allocatedCents,
    ).toBe(0);
  });
});
