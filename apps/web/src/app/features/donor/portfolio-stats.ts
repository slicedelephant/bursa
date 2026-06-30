import { CumulativeStats, PeerComparison } from '../../core/models';

/** Pure presentation helpers for the donor portfolio's cumulative stats + peer
 * comparison. No I/O; returns new values, never mutates inputs. */

export interface StatTile {
  readonly label: string;
  readonly value: number;
  readonly money?: boolean;
}

export function statTiles(stats: CumulativeStats): StatTile[] {
  return [
    { label: 'Total given', value: stats.totalCents, money: true },
    { label: 'Students supported', value: stats.distinctTargets },
    { label: 'Donations', value: stats.contributionCount },
    { label: 'Impact per student', value: stats.impactPerTargetCents, money: true },
  ];
}

function students(n: number): string {
  return `${n} student${n === 1 ? '' : 's'}`;
}

export function peerComparisonText(peer: PeerComparison): string {
  const lead = `The average donor supports ${students(peer.peerAverage)}. You support ${peer.yourValue}`;
  return peer.ahead ? `${lead} — you’re ahead!` : `${lead} — a great start.`;
}
