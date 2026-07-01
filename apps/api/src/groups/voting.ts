/**
 * E18 Groups — pure voting tally. A group votes on which campaign to support next:
 * each member casts at most one ballot (the DB unique is the hard guarantee).
 * `tallyVote` counts ballots per option, picks the winner (highest count, with a
 * deterministic tie-break by option id) and reports total votes, quorum status and
 * whether the vote is decided. No I/O, no mutation; returns new values.
 */

export interface VoteOption {
  readonly id: string;
}

export interface Ballot {
  readonly optionId: string;
}

export interface TallyInput {
  readonly options: ReadonlyArray<VoteOption>;
  readonly ballots: ReadonlyArray<Ballot>;
  /** Optional minimum total votes before the result counts as reached. */
  readonly quorum?: number;
}

export interface OptionCount {
  readonly optionId: string;
  readonly count: number;
}

export interface TallyResult {
  readonly counts: OptionCount[];
  readonly totalVotes: number;
  /** The winning option id, or null when there are no valid ballots. */
  readonly winnerId: string | null;
  /** True when there is a single unambiguous leader. */
  readonly decided: boolean;
  /** True when quorum is not set, or total votes meet it. */
  readonly quorumMet: boolean;
}

export function tallyVote(input: TallyInput): TallyResult {
  const valid = new Set(input.options.map((o) => o.id));
  const tally = new Map<string, number>();
  for (const option of input.options) {
    tally.set(option.id, 0);
  }

  let totalVotes = 0;
  for (const ballot of input.ballots) {
    if (!valid.has(ballot.optionId)) continue;
    tally.set(ballot.optionId, (tally.get(ballot.optionId) ?? 0) + 1);
    totalVotes += 1;
  }

  const counts: OptionCount[] = [...tally.entries()]
    .map(([optionId, count]) => ({ optionId, count }))
    .sort((a, b) => b.count - a.count || a.optionId.localeCompare(b.optionId));

  const top = counts[0];
  const winnerId = top && top.count > 0 ? top.optionId : null;
  const runnerUp = counts[1];
  const decided =
    winnerId !== null && (runnerUp === undefined || runnerUp.count < top.count);

  const quorumMet = input.quorum === undefined || totalVotes >= input.quorum;

  return { counts, totalVotes, winnerId, decided, quorumMet };
}
