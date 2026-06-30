/**
 * Pure leaderboard ranker — a generic gamification primitive. Sorts generic
 * `{ id, label, score }` entries by score (desc) with a stable, deterministic
 * tie-break (id asc) and assigns ranks. No I/O, no real-time infra; a live board
 * is out of scope. Reused-ready for E15 (advocate leaderboard) and E18 (giving
 * circles). Returns a new array; never mutates the input.
 */

export interface LeaderboardInput {
  readonly id: string;
  readonly label: string;
  readonly score: number;
}

export interface LeaderboardEntry extends LeaderboardInput {
  readonly rank: number;
}

export function rankLeaderboard(
  entries: ReadonlyArray<LeaderboardInput>,
): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
