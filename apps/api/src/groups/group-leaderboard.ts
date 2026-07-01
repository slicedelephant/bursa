/**
 * E18 Groups — pure group leaderboard assembler. This is a THIN wrapper over the
 * E16 gamification primitive `rankLeaderboard`: it maps member contributions onto
 * the generic `{ id, label, score }` shape and delegates ranking (stable tie-break,
 * deterministic) to E16. It does NOT re-implement ranking. Supports an anonymous
 * mode ("Member #n" labels) for the anonymous weekly ranking. No I/O, no mutation.
 */

import {
  LeaderboardEntry,
  rankLeaderboard,
} from '../gamification/leaderboard.util';

export interface MemberContribution {
  readonly userId: string;
  readonly label: string;
  readonly valueCents: number;
}

export interface GroupLeaderboardOptions {
  /** When true, member names are replaced by rank-stable "Member #n" labels. */
  readonly anonymous?: boolean;
}

export function buildGroupLeaderboard(
  members: ReadonlyArray<MemberContribution>,
  options: GroupLeaderboardOptions = {},
): LeaderboardEntry[] {
  const ranked = rankLeaderboard(
    members.map((m) => ({
      id: m.userId,
      label: m.label,
      score: m.valueCents,
    })),
  );
  if (!options.anonymous) {
    return ranked;
  }
  return ranked.map((entry) => ({
    ...entry,
    label: `Member #${entry.rank}`,
  }));
}
