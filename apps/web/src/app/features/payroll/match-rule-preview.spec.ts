import { previewRule, ratioLabel } from './match-rule-preview';

describe('ratioLabel', () => {
  it('formats whole ratios', () => {
    expect(ratioLabel(100)).toBe('1:1');
    expect(ratioLabel(200)).toBe('2:1');
  });
  it('formats a half ratio', () => {
    expect(ratioLabel(50)).toBe('0.5:1');
  });
  it('clamps a negative ratio', () => {
    expect(ratioLabel(-100)).toBe('0:1');
  });
});

describe('previewRule', () => {
  it('previews a 1:1 match below the cap', () => {
    const r = previewRule({
      contributionCents: 10_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
    });
    expect(r.matchCents).toBe(10_000);
    expect(r.capped).toBe(false);
    expect(r.ratioLabel).toBe('1:1');
  });

  it('caps the preview at the per-employee cap', () => {
    const r = previewRule({
      contributionCents: 100_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
    });
    expect(r.matchCents).toBe(50_000);
    expect(r.capped).toBe(true);
  });

  it('floors a fractional match', () => {
    const r = previewRule({
      contributionCents: 333,
      matchRatio: 50,
      perEmployeeCapCents: 50_000,
    });
    expect(r.matchCents).toBe(166);
  });

  it('treats a negative contribution as 0', () => {
    const r = previewRule({
      contributionCents: -100,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
    });
    expect(r.matchCents).toBe(0);
  });
});
