import { BadgeProgress } from '../gamification/badge.util';
import { CumulativeStats } from '../gamification/cumulative.util';
import { PeerComparison } from '../gamification/peer-comparison.util';
import { StreakState } from '../gamification/streak.util';

/** One supported student in the donor's portfolio ("My students"). */
export interface PortfolioItem {
  readonly campaignId: string;
  readonly studentName: string;
  readonly photoUrl: string | null;
  readonly country: string;
  readonly schoolName: string;
  readonly campaignTitle: string;
  readonly raisedCents: number;
  readonly goalCents: number;
  readonly percent: number;
  readonly verified: boolean;
  readonly yourContributionCents: number;
  readonly canDonateAgain: boolean;
}

/** The full donor portfolio view: students + streak + badge + stats + peer compare. */
export interface PortfolioView {
  readonly items: PortfolioItem[];
  readonly streak: StreakState;
  readonly badge: BadgeProgress;
  readonly stats: CumulativeStats;
  readonly peer: PeerComparison;
}
