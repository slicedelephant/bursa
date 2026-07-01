import { summarizeCampaign } from './campaign-summary';

describe('summarizeCampaign', () => {
  it('returns zeros for an empty run', () => {
    const s = summarizeCampaign([]);
    expect(s.contributions).toBe(0);
    expect(s.totalToSchoolCents).toBe(0);
  });

  it('sums contributions + matches into the school total', () => {
    const s = summarizeCampaign([
      { contributionCents: 10_000, matchCents: 10_000 },
      { contributionCents: 5_000, matchCents: 5_000 },
    ]);
    expect(s.contributions).toBe(2);
    expect(s.totalContributionCents).toBe(15_000);
    expect(s.totalMatchCents).toBe(15_000);
    expect(s.totalToSchoolCents).toBe(30_000);
  });

  it('floors and clamps negative amounts', () => {
    const s = summarizeCampaign([
      { contributionCents: -100, matchCents: 250.9 },
    ]);
    expect(s.totalContributionCents).toBe(0);
    expect(s.totalMatchCents).toBe(250);
    expect(s.totalToSchoolCents).toBe(250);
  });
});
