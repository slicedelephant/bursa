import { GroupVoteView } from '../../core/models';
import { optionPercent, voteStatusText, winnerLabel } from './voting-format';

function vote(overrides: Partial<GroupVoteView> = {}): GroupVoteView {
  return {
    id: 'v1',
    question: 'Who next?',
    status: 'OPEN',
    options: [
      { id: 'o1', label: 'Amara', campaignId: 'c1', count: 3 },
      { id: 'o2', label: 'Ben', campaignId: 'c2', count: 1 },
    ],
    totalVotes: 4,
    winnerId: 'o1',
    decided: true,
    ...overrides,
  };
}

describe('voting-format', () => {
  it('shows an open vote with a leader', () => {
    expect(voteStatusText(vote())).toBe('Open — leader emerging');
  });

  it('shows an open vote with no clear leader', () => {
    expect(voteStatusText(vote({ decided: false }))).toBe('Open');
  });

  it('shows a closed vote', () => {
    expect(voteStatusText(vote({ status: 'CLOSED' }))).toBe('Closed');
  });

  it('computes an option percent', () => {
    const v = vote();
    expect(optionPercent(v.options[0], v.totalVotes)).toBe(75);
    expect(optionPercent(v.options[1], v.totalVotes)).toBe(25);
  });

  it('returns 0 percent when there are no votes', () => {
    const v = vote({ totalVotes: 0 });
    expect(optionPercent(v.options[0], v.totalVotes)).toBe(0);
  });

  it('labels the winner', () => {
    expect(winnerLabel(vote())).toBe('Amara');
  });

  it('labels no winner when there are no votes', () => {
    expect(winnerLabel(vote({ winnerId: null }))).toBe('No votes yet');
  });
});
