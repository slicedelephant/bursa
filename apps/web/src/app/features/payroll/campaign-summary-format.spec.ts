import { CampaignRunResult } from '../../core/models';
import { campaignHeadline, hasContributions, matchSharePercent } from './campaign-summary-format';

const result: CampaignRunResult = {
  programId: 'p1',
  campaignId: 'c1',
  contributions: 3,
  totalContributionCents: 30_000,
  totalMatchCents: 30_000,
  totalToSchoolCents: 60_000,
};

describe('campaignHeadline', () => {
  it('summarises a multi-employee run and mentions the school', () => {
    const h = campaignHeadline(result);
    expect(h).toContain('3 employees gave €300');
    expect(h).toContain('€600 to the school');
  });

  it('uses the singular for one employee', () => {
    expect(campaignHeadline({ ...result, contributions: 1 })).toContain('1 employee gave');
  });
});

describe('hasContributions', () => {
  it('reflects whether any contribution was booked', () => {
    expect(hasContributions(result)).toBe(true);
    expect(hasContributions({ ...result, contributions: 0 })).toBe(false);
  });
});

describe('matchSharePercent', () => {
  it('computes the match share of the school total', () => {
    expect(matchSharePercent(result)).toBe(50);
  });
  it('returns 0 when nothing went to the school', () => {
    expect(matchSharePercent({ ...result, totalToSchoolCents: 0 })).toBe(0);
  });
});
