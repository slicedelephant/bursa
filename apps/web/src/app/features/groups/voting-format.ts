import { GroupVoteOptionView, GroupVoteView } from '../../core/models';

/** Pure presentation helpers for group voting. No I/O; return new values. */

export function voteStatusText(vote: GroupVoteView): string {
  if (vote.status === 'CLOSED') {
    return 'Closed';
  }
  return vote.decided ? 'Open — leader emerging' : 'Open';
}

/** Integer percent of the total votes an option holds (0 when no votes yet). */
export function optionPercent(option: GroupVoteOptionView, totalVotes: number): number {
  if (totalVotes <= 0) return 0;
  return Math.round((option.count / totalVotes) * 100);
}

/** The winning option's label, or a placeholder when undecided/no votes. */
export function winnerLabel(vote: GroupVoteView): string {
  if (vote.winnerId === null) return 'No votes yet';
  const winner = vote.options.find((o) => o.id === vote.winnerId);
  return winner ? winner.label : 'Unknown';
}
