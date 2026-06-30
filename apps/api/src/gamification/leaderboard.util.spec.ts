import { rankLeaderboard } from './leaderboard.util';

describe('rankLeaderboard', () => {
  it('ranks by score descending', () => {
    const res = rankLeaderboard([
      { id: 'a', label: 'Ann', score: 10 },
      { id: 'b', label: 'Bob', score: 30 },
      { id: 'c', label: 'Cy', score: 20 },
    ]);
    expect(res.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(res.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('breaks ties deterministically by id ascending', () => {
    const res = rankLeaderboard([
      { id: 'z', label: 'Z', score: 5 },
      { id: 'a', label: 'A', score: 5 },
    ]);
    expect(res.map((e) => e.id)).toEqual(['a', 'z']);
    expect(res.map((e) => e.rank)).toEqual([1, 2]);
  });

  it('returns an empty array for no entries', () => {
    expect(rankLeaderboard([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const input = [
      { id: 'a', label: 'A', score: 1 },
      { id: 'b', label: 'B', score: 2 },
    ];
    const snapshot = JSON.stringify(input);
    rankLeaderboard(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
