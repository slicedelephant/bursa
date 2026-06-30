import {
  buildAdvocateLeaderboard,
  buildReferralLeaderboard,
} from './referral-leaderboard.util';

describe('referral-leaderboard.util', () => {
  const rows = [
    { id: 'b', label: 'Bea', count: 3 },
    { id: 'a', label: 'Ada', count: 6 },
    { id: 'c', label: 'Cy', count: 3 },
  ];

  describe('buildAdvocateLeaderboard', () => {
    it('ranks by count desc with id-asc tie-break and keeps names', () => {
      const board = buildAdvocateLeaderboard(rows);
      expect(board).toEqual([
        { id: 'a', label: 'Ada', score: 6, rank: 1 },
        { id: 'b', label: 'Bea', score: 3, rank: 2 },
        { id: 'c', label: 'Cy', score: 3, rank: 3 },
      ]);
    });

    it('returns an empty board for no rows', () => {
      expect(buildAdvocateLeaderboard([])).toEqual([]);
    });

    it('does not mutate the input rows', () => {
      const input = [{ id: 'x', label: 'X', count: 1 }];
      buildAdvocateLeaderboard(input);
      expect(input).toEqual([{ id: 'x', label: 'X', count: 1 }]);
    });
  });

  describe('buildReferralLeaderboard', () => {
    it('anonymises labels as "Supporter #rank" but keeps ids', () => {
      const board = buildReferralLeaderboard(rows);
      expect(board).toEqual([
        { id: 'a', label: 'Supporter #1', score: 6, rank: 1 },
        { id: 'b', label: 'Supporter #2', score: 3, rank: 2 },
        { id: 'c', label: 'Supporter #3', score: 3, rank: 3 },
      ]);
    });

    it('never leaks the original label', () => {
      const board = buildReferralLeaderboard(rows);
      expect(board.some((e) => e.label === 'Ada')).toBe(false);
    });

    it('returns an empty board for no rows', () => {
      expect(buildReferralLeaderboard([])).toEqual([]);
    });
  });
});
