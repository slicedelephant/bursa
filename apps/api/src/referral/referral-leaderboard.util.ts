// Pure referral/advocate leaderboard assembler (E15). A thin wrapper over the
// reusable E16 gamification primitive `rankLeaderboard` (leaderboard.util.ts): it maps
// referral/advocate counts onto the generic `{ id, label, score }` input and lets the
// primitive do the ranking (score desc, stable id-asc tie-break). The referral board
// anonymises labels for the opt-in public board. No I/O; returns new arrays; never
// mutates inputs. No second leaderboard engine — this only feeds the E16 ranker.

import {
  LeaderboardEntry,
  rankLeaderboard,
} from '../gamification/leaderboard.util';

export interface LeaderboardRow {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

/** Advocate board: keeps the advocate's display name as the label. */
export function buildAdvocateLeaderboard(
  rows: ReadonlyArray<LeaderboardRow>,
): LeaderboardEntry[] {
  return rankLeaderboard(
    rows.map((row) => ({ id: row.id, label: row.label, score: row.count })),
  );
}

/**
 * Referral board: anonymises labels to "Supporter #N" by final rank, so an opt-in
 * public board never exposes donor identities (only the stable id is carried for the
 * client to highlight "you").
 */
export function buildReferralLeaderboard(
  rows: ReadonlyArray<LeaderboardRow>,
): LeaderboardEntry[] {
  const ranked = rankLeaderboard(
    rows.map((row) => ({ id: row.id, label: row.id, score: row.count })),
  );
  return ranked.map((entry) => ({
    ...entry,
    label: `Supporter #${entry.rank}`,
  }));
}
