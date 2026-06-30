import { LeaderboardEntry } from '../gamification/leaderboard.util';
import { ReferralReward } from './reward-tier.util';
import { ShareTemplates } from './share-template.util';
import { ReferralStats } from './referral-stats.util';

/** The donor's referral view: link, tracking stats, reward, opt-in, share templates. */
export interface DonorReferralView {
  readonly link: { code: string; shareUrl: string };
  readonly stats: ReferralStats;
  readonly reward: ReferralReward;
  readonly optInLeaderboard: boolean;
  readonly templates: ShareTemplates;
}

/** A created advocate invite — the raw share link is returned exactly once here. */
export interface CreatedAdvocateView {
  readonly id: string;
  readonly name: string;
  readonly shareUrl: string;
  readonly templates: ShareTemplates;
}

/** One advocate in the fundraiser dashboard. */
export interface AdvocateRowView {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly referralCount: number;
  readonly reward: ReferralReward;
  readonly rank: number;
}

/** The fundraiser's advocate dashboard for one campaign. */
export interface AdvocateDashboardView {
  readonly campaignId: string;
  readonly advocateCount: number;
  readonly remaining: number;
  readonly advocates: AdvocateRowView[];
  readonly leaderboard: LeaderboardEntry[];
}

export interface LeaderboardView {
  readonly entries: LeaderboardEntry[];
}
