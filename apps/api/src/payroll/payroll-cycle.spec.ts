import { daysBetween, decidePayrollCycle } from './payroll-cycle';

const D = (iso: string) => new Date(iso);

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween(D('2026-01-01'), D('2026-01-08'))).toBe(7);
  });
  it('never returns negative', () => {
    expect(daysBetween(D('2026-01-08'), D('2026-01-01'))).toBe(0);
  });
});

describe('decidePayrollCycle', () => {
  it('is due on the first run (no lastRunAt)', () => {
    const r = decidePayrollCycle({ cycle: 'MONTHLY', now: D('2026-06-01') });
    expect(r.due).toBe(true);
    expect(r.cycleDays).toBe(30);
  });

  it('is due when a full weekly cycle has elapsed', () => {
    const r = decidePayrollCycle({
      cycle: 'WEEKLY',
      now: D('2026-06-08'),
      lastRunAt: D('2026-06-01'),
    });
    expect(r.due).toBe(true);
  });

  it('is not due within the cycle', () => {
    const r = decidePayrollCycle({
      cycle: 'MONTHLY',
      now: D('2026-06-10'),
      lastRunAt: D('2026-06-01'),
    });
    expect(r.due).toBe(false);
  });

  it('schedules the next run one cycle after now', () => {
    const r = decidePayrollCycle({ cycle: 'WEEKLY', now: D('2026-06-01') });
    expect(r.nextRunAt).toBe(D('2026-06-08').toISOString());
  });

  it('handles a future lastRunAt by anchoring on it', () => {
    const r = decidePayrollCycle({
      cycle: 'WEEKLY',
      now: D('2026-06-01'),
      lastRunAt: D('2026-06-05'),
    });
    expect(r.due).toBe(false);
    expect(r.nextRunAt).toBe(D('2026-06-12').toISOString());
  });

  it('uses the semimonthly and biweekly cadences', () => {
    expect(
      decidePayrollCycle({ cycle: 'SEMIMONTHLY', now: D('2026-06-01') })
        .cycleDays,
    ).toBe(15);
    expect(
      decidePayrollCycle({ cycle: 'BIWEEKLY', now: D('2026-06-01') }).cycleDays,
    ).toBe(14);
  });
});
