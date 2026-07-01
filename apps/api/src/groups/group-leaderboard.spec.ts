import { MemberContribution, buildGroupLeaderboard } from './group-leaderboard';

const members: MemberContribution[] = [
  { userId: 'u_ben', label: 'Ben Mensah', valueCents: 800_000 },
  { userId: 'u_amara', label: 'Amara Okonkwo', valueCents: 1_200_000 },
  { userId: 'u_cy', label: 'Cy Diallo', valueCents: 800_000 },
];

describe('buildGroupLeaderboard', () => {
  it('ranks members by contribution via the E16 primitive (desc, id tie-break)', () => {
    const board = buildGroupLeaderboard(members);
    expect(board.map((e) => e.id)).toEqual(['u_amara', 'u_ben', 'u_cy']);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
    // Ben and Cy tie on score; the E16 primitive breaks ties by id asc.
    expect(board[1].id).toBe('u_ben');
    expect(board[2].id).toBe('u_cy');
  });

  it('keeps real names when not anonymous', () => {
    const board = buildGroupLeaderboard(members);
    expect(board[0].label).toBe('Amara Okonkwo');
  });

  it('anonymises labels to "Member #n" by rank', () => {
    const board = buildGroupLeaderboard(members, { anonymous: true });
    expect(board.map((e) => e.label)).toEqual([
      'Member #1',
      'Member #2',
      'Member #3',
    ]);
    // ids are preserved so the caller can still map back if needed
    expect(board[0].id).toBe('u_amara');
  });

  it('returns an empty board for no members', () => {
    expect(buildGroupLeaderboard([])).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = members.map((m) => ({ ...m }));
    buildGroupLeaderboard(members, { anonymous: true });
    expect(members).toEqual(copy);
  });
});
