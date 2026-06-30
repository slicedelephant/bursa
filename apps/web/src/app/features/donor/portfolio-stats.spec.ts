import { CumulativeStats, PeerComparison } from '../../core/models';
import { peerComparisonText, statTiles } from './portfolio-stats';

const stats = (over: Partial<CumulativeStats> = {}): CumulativeStats => ({
  totalCents: 53000,
  contributionCount: 9,
  distinctTargets: 5,
  impactPerTargetCents: 10600,
  firstMonth: '2025-12',
  lastMonth: '2026-06',
  ...over,
});

const peer = (over: Partial<PeerComparison> = {}): PeerComparison => ({
  yourValue: 5,
  peerAverage: 2.4,
  ratio: 2.08,
  ahead: true,
  ...over,
});

describe('statTiles', () => {
  it('exposes total given, students, donations and impact per student', () => {
    const tiles = statTiles(stats());
    const byLabel = Object.fromEntries(tiles.map((t) => [t.label, t]));
    expect(byLabel['Total given'].value).toBe(53000);
    expect(byLabel['Total given'].money).toBe(true);
    expect(byLabel['Students supported'].value).toBe(5);
    expect(byLabel['Donations'].value).toBe(9);
    expect(byLabel['Impact per student'].value).toBe(10600);
    expect(byLabel['Impact per student'].money).toBe(true);
  });
});

describe('peerComparisonText', () => {
  it('encourages when ahead of the average', () => {
    expect(peerComparisonText(peer())).toBe(
      'The average donor supports 2.4 students. You support 5 — you’re ahead!',
    );
  });

  it('encourages forward when below the average', () => {
    expect(peerComparisonText(peer({ yourValue: 1, peerAverage: 2.4, ahead: false }))).toBe(
      'The average donor supports 2.4 students. You support 1 — a great start.',
    );
  });

  it('handles the singular case', () => {
    expect(peerComparisonText(peer({ yourValue: 1, peerAverage: 1, ahead: true }))).toBe(
      'The average donor supports 1 student. You support 1 — you’re ahead!',
    );
  });
});
