import { aggregateRubric, RubricField, RubricScore } from './rubric-aggregator';

const fields: RubricField[] = [
  { fieldKey: 'why', rubricWeight: 3 },
  { fieldKey: 'leadership', rubricWeight: 2 },
  { fieldKey: 'note', rubricWeight: 0 }, // non-rubric field, ignored
];

describe('aggregateRubric', () => {
  it('computes a weighted consensus normalized to 0-100', () => {
    const scores: RubricScore[] = [
      { fieldKey: 'why', score: 5 },
      { fieldKey: 'why', score: 4 }, // avg 4.5
      { fieldKey: 'leadership', score: 5 }, // avg 5
    ];
    // weighted = (4.5*3 + 5*2) / 5 = 23.5/5 = 4.7 -> /5*100 = 94
    const res = aggregateRubric({ fields, scores });
    expect(res.consensus).toBe(94);
    expect(res.perField.find((p) => p.fieldKey === 'why')?.average).toBe(4.5);
    expect(res.perField.find((p) => p.fieldKey === 'why')?.count).toBe(2);
  });

  it('ignores fields with zero rubric weight', () => {
    const res = aggregateRubric({
      fields,
      scores: [{ fieldKey: 'note', score: 5 }],
    });
    expect(res.perField.some((p) => p.fieldKey === 'note')).toBe(false);
  });

  it('gives a full-score submission a consensus of 100', () => {
    const scores: RubricScore[] = [
      { fieldKey: 'why', score: 5 },
      { fieldKey: 'leadership', score: 5 },
    ];
    expect(aggregateRubric({ fields, scores }).consensus).toBe(100);
  });

  it('returns 0 consensus when there are no scores', () => {
    const res = aggregateRubric({ fields, scores: [] });
    expect(res.consensus).toBe(0);
    expect(res.perField.every((p) => p.count === 0)).toBe(true);
  });

  it('returns 0 consensus when total weight is zero', () => {
    const res = aggregateRubric({
      fields: [{ fieldKey: 'x', rubricWeight: 0 }],
      scores: [{ fieldKey: 'x', score: 5 }],
    });
    expect(res.consensus).toBe(0);
  });

  it('does not mutate the scores input', () => {
    const scores: RubricScore[] = [{ fieldKey: 'why', score: 5 }];
    const copy = [...scores];
    aggregateRubric({ fields, scores });
    expect(scores).toEqual(copy);
  });
});
