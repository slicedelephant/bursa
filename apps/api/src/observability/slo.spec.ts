import {
  evaluateSlo,
  PAGE_BURN_THRESHOLD,
  TICKET_BURN_THRESHOLD,
} from './slo';

describe('evaluateSlo', () => {
  it('exposes the error budget derived from the objective', () => {
    const report = evaluateSlo([], 99.9);
    expect(report.objectivePct).toBe(99.9);
    expect(report.errorBudgetPct).toBeCloseTo(0.1, 5);
    expect(report.alert).toBe('none');
  });

  it('computes per-window SLI, burn rate and capped budget consumption', () => {
    const report = evaluateSlo(
      [{ label: 'fast', good: 980, total: 1000 }],
      99.9,
    );
    const w = report.windows[0];
    expect(w.sliPct).toBe(98);
    expect(w.burnRate).toBe(20); // errorRate 0.02 / budget 0.001
    expect(w.budgetConsumedPct).toBe(100); // capped
  });

  it('fires a PAGE alert when fast + fast_short both exceed 14.4', () => {
    const report = evaluateSlo(
      [
        { label: 'fast', good: 980, total: 1000 },
        { label: 'fast_short', good: 96, total: 100 },
      ],
      99.9,
    );
    expect(report.alert).toBe('page');
  });

  it('does not page when only one fast window is hot', () => {
    const report = evaluateSlo(
      [
        { label: 'fast', good: 980, total: 1000 },
        { label: 'fast_short', good: 100, total: 100 },
      ],
      99.9,
    );
    expect(report.alert).toBe('none');
  });

  it('fires a TICKET alert on the slow pair when not paging', () => {
    const report = evaluateSlo(
      [
        { label: 'fast', good: 993, total: 1000 },
        { label: 'fast_short', good: 993, total: 1000 },
        { label: 'slow', good: 993, total: 1000 },
        { label: 'slow_short', good: 993, total: 1000 },
      ],
      99.9,
    );
    // burn rate 7 (>=6 ticket) but < 14.4 (no page)
    expect(report.alert).toBe('ticket');
  });

  it('returns none for a perfectly healthy slow pair', () => {
    const report = evaluateSlo(
      [
        { label: 'slow', good: 1000, total: 1000 },
        { label: 'slow_short', good: 1000, total: 1000 },
      ],
      99.9,
    );
    expect(report.alert).toBe('none');
  });

  it('treats empty windows (total 0) as fully healthy', () => {
    const report = evaluateSlo([{ label: 'fast', good: 0, total: 0 }], 99.9);
    expect(report.windows[0].sliPct).toBe(100);
    expect(report.windows[0].burnRate).toBe(0);
  });

  it('exposes sane thresholds', () => {
    expect(PAGE_BURN_THRESHOLD).toBeGreaterThan(TICKET_BURN_THRESHOLD);
  });
});
