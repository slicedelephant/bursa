import { decideAwards, RankedApplication } from './award-decision';

const ranked: RankedApplication[] = [
  { appId: 'app_c', consensusScore: 90 },
  { appId: 'app_a', consensusScore: 95 },
  { appId: 'app_b', consensusScore: 90 },
  { appId: 'app_d', consensusScore: 80 },
];

describe('decideAwards', () => {
  it('selects the highest-scoring applications up to the slot count', () => {
    const res = decideAwards({
      ranked,
      budgetCents: 10_000_000,
      slots: 2,
      awardCents: 2_000_000,
    });
    expect(res.winners.map((w) => w.appId)).toEqual(['app_a', 'app_b']);
    expect(res.spentCents).toBe(4_000_000);
  });

  it('breaks score ties deterministically by appId ascending', () => {
    const res = decideAwards({
      ranked,
      budgetCents: 10_000_000,
      slots: 3,
      awardCents: 2_000_000,
    });
    // 95: app_a, then 90 tie -> app_b before app_c
    expect(res.winners.map((w) => w.appId)).toEqual([
      'app_a',
      'app_b',
      'app_c',
    ]);
  });

  it('stops when the budget is exhausted before the slots', () => {
    const res = decideAwards({
      ranked,
      budgetCents: 3_000_000,
      slots: 5,
      awardCents: 2_000_000,
    });
    expect(res.winners).toHaveLength(1);
    expect(res.spentCents).toBe(2_000_000);
  });

  it('awards nobody when awardCents is zero', () => {
    const res = decideAwards({
      ranked,
      budgetCents: 10_000_000,
      slots: 3,
      awardCents: 0,
    });
    expect(res.winners).toHaveLength(0);
    expect(res.spentCents).toBe(0);
  });

  it('awards nobody when budget cannot cover a single award', () => {
    const res = decideAwards({
      ranked,
      budgetCents: 1_000_000,
      slots: 3,
      awardCents: 2_000_000,
    });
    expect(res.winners).toHaveLength(0);
  });

  it('orders tied scores by appId regardless of input order', () => {
    const reversed = [
      { appId: 'app_z', consensusScore: 90 },
      { appId: 'app_y', consensusScore: 90 },
      { appId: 'app_x', consensusScore: 90 },
    ];
    const res = decideAwards({
      ranked: reversed,
      budgetCents: 10_000_000,
      slots: 3,
      awardCents: 1_000_000,
    });
    expect(res.winners.map((w) => w.appId)).toEqual([
      'app_x',
      'app_y',
      'app_z',
    ]);
  });

  it('treats identical appIds as equal in the tie-break', () => {
    const dupes = [
      { appId: 'same', consensusScore: 90 },
      { appId: 'same', consensusScore: 90 },
    ];
    const res = decideAwards({
      ranked: dupes,
      budgetCents: 10_000_000,
      slots: 2,
      awardCents: 1_000_000,
    });
    expect(res.winners).toHaveLength(2);
  });

  it('does not mutate the ranked input', () => {
    const copy = [...ranked];
    decideAwards({
      ranked,
      budgetCents: 10_000_000,
      slots: 2,
      awardCents: 2_000_000,
    });
    expect(ranked).toEqual(copy);
  });
});
