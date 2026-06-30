import { PortfolioView } from './portfolio.types';
import { portfolioPdfLines, toPortfolioCsv } from './portfolio-export.util';

const view = (): PortfolioView => ({
  items: [
    {
      campaignId: 'c1',
      studentName: 'Amara Okonkwo',
      photoUrl: '/seed/amara.png',
      country: 'Nigeria',
      schoolName: 'ESMT Berlin',
      campaignTitle: 'Help, Amara!',
      raisedCents: 1840000,
      goalCents: 4500000,
      percent: 41,
      verified: true,
      yourContributionCents: 45000,
      canDonateAgain: true,
    },
    {
      campaignId: 'c2',
      studentName: 'Kwame "KJ" Mensah',
      photoUrl: null,
      country: 'Ghana',
      schoolName: 'INSEAD',
      campaignTitle: 'Kwame to INSEAD',
      raisedCents: 500000,
      goalCents: 5000000,
      percent: 10,
      verified: false,
      yourContributionCents: 8000,
      canDonateAgain: false,
    },
  ],
  streak: {
    currentMonths: 7,
    longestMonths: 7,
    currentMonthCovered: true,
    lastActiveMonth: '2026-06',
  },
  badge: {
    tier: 'SILVER',
    streakMonths: 7,
    nextTier: 'GOLD',
    monthsToNextTier: 5,
  },
  stats: {
    totalCents: 53000,
    contributionCount: 9,
    distinctTargets: 2,
    impactPerTargetCents: 26500,
    firstMonth: '2025-12',
    lastMonth: '2026-06',
  },
  peer: { yourValue: 2, peerAverage: 2.4, ratio: 0.83, ahead: false },
});

describe('toPortfolioCsv', () => {
  it('emits a header row and one row per student', () => {
    const csv = toPortfolioCsv(view());
    const lines = csv.trimEnd().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'Student,Country,School,Campaign,Progress (%),Your contribution (EUR),Verified',
    );
  });

  it('formats euros and percent and verified flag', () => {
    const csv = toPortfolioCsv(view());
    expect(csv).toContain('450.00');
    expect(csv).toContain('41');
    expect(csv).toContain('Yes');
    expect(csv).toContain('No');
  });

  it('escapes a value containing a quote/comma', () => {
    const csv = toPortfolioCsv(view());
    expect(csv).toContain('"Kwame ""KJ"" Mensah"');
  });
});

describe('portfolioPdfLines', () => {
  it('includes streak, badge and stat summary lines', () => {
    const lines = portfolioPdfLines(view());
    const text = lines.join('\n');
    expect(text).toContain('Current streak: 7 months');
    expect(text).toContain('Badge: SILVER');
    expect(text).toContain('Students supported: 2');
    expect(text).toContain('Total given: EUR 530.00');
  });

  it('lists each student with their contribution', () => {
    const lines = portfolioPdfLines(view());
    const text = lines.join('\n');
    expect(text).toContain('Amara Okonkwo');
    expect(text).toContain('Nigeria');
    expect(text).toContain('EUR 450.00');
  });
});
