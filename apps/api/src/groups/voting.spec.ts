import { tallyVote } from './voting';

const options = [{ id: 'opt_a' }, { id: 'opt_b' }, { id: 'opt_c' }];

describe('tallyVote', () => {
  it('counts ballots per option and picks the clear winner', () => {
    const result = tallyVote({
      options,
      ballots: [
        { optionId: 'opt_a' },
        { optionId: 'opt_a' },
        { optionId: 'opt_b' },
      ],
    });
    expect(result.totalVotes).toBe(3);
    expect(result.winnerId).toBe('opt_a');
    expect(result.decided).toBe(true);
    expect(result.counts[0]).toEqual({ optionId: 'opt_a', count: 2 });
  });

  it('includes zero-count options in the tally', () => {
    const result = tallyVote({ options, ballots: [{ optionId: 'opt_a' }] });
    const cCount = result.counts.find((c) => c.optionId === 'opt_c');
    expect(cCount).toEqual({ optionId: 'opt_c', count: 0 });
  });

  it('breaks a tie deterministically by option id but is not "decided"', () => {
    const result = tallyVote({
      options,
      ballots: [{ optionId: 'opt_b' }, { optionId: 'opt_a' }],
    });
    // opt_a and opt_b both have 1 → sorted by id asc → opt_a leads
    expect(result.winnerId).toBe('opt_a');
    expect(result.decided).toBe(false);
  });

  it('returns no winner when there are no ballots', () => {
    const result = tallyVote({ options, ballots: [] });
    expect(result.winnerId).toBeNull();
    expect(result.decided).toBe(false);
    expect(result.totalVotes).toBe(0);
  });

  it('ignores ballots for unknown options', () => {
    const result = tallyVote({
      options,
      ballots: [{ optionId: 'ghost' }, { optionId: 'opt_a' }],
    });
    expect(result.totalVotes).toBe(1);
    expect(result.winnerId).toBe('opt_a');
  });

  it('reports quorum status', () => {
    expect(
      tallyVote({ options, ballots: [{ optionId: 'opt_a' }], quorum: 3 })
        .quorumMet,
    ).toBe(false);
    expect(
      tallyVote({
        options,
        ballots: [
          { optionId: 'opt_a' },
          { optionId: 'opt_a' },
          { optionId: 'opt_b' },
        ],
        quorum: 3,
      }).quorumMet,
    ).toBe(true);
    expect(
      tallyVote({ options, ballots: [{ optionId: 'opt_a' }] }).quorumMet,
    ).toBe(true);
  });
});
