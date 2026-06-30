import { addMonth, advance, duePledges, isDue } from './recurring-engine';

describe('addMonth', () => {
  it('advances one calendar month', () => {
    const r = addMonth(new Date('2026-03-15T10:00:00.000Z'));
    expect(r.toISOString()).toBe('2026-04-15T10:00:00.000Z');
  });

  it('clamps to the last day of a shorter month', () => {
    const r = addMonth(new Date('2026-01-31T08:00:00.000Z'));
    expect(r.toISOString()).toBe('2026-02-28T08:00:00.000Z');
  });

  it('rolls over the year boundary', () => {
    const r = addMonth(new Date('2026-12-10T00:00:00.000Z'));
    expect(r.toISOString()).toBe('2027-01-10T00:00:00.000Z');
  });
});

describe('isDue', () => {
  const now = new Date('2026-06-27T12:00:00.000Z');

  it('is due when ACTIVE and nextRunAt has passed', () => {
    expect(
      isDue(
        { status: 'ACTIVE', nextRunAt: new Date('2026-06-27T11:00:00.000Z') },
        now,
      ),
    ).toBe(true);
  });

  it('is not due when nextRunAt is in the future', () => {
    expect(
      isDue(
        { status: 'ACTIVE', nextRunAt: new Date('2026-06-28T00:00:00.000Z') },
        now,
      ),
    ).toBe(false);
  });

  it('is never due when paused or cancelled', () => {
    const past = new Date('2026-01-01T00:00:00.000Z');
    expect(isDue({ status: 'PAUSED', nextRunAt: past }, now)).toBe(false);
    expect(isDue({ status: 'CANCELLED', nextRunAt: past }, now)).toBe(false);
  });
});

describe('duePledges', () => {
  it('filters to the due ACTIVE pledges only', () => {
    const now = new Date('2026-06-27T12:00:00.000Z');
    const past = new Date('2026-06-01T00:00:00.000Z');
    const future = new Date('2026-07-01T00:00:00.000Z');
    const pledges = [
      { id: 'a', status: 'ACTIVE', nextRunAt: past },
      { id: 'b', status: 'ACTIVE', nextRunAt: future },
      { id: 'c', status: 'PAUSED', nextRunAt: past },
    ];
    expect(duePledges(pledges, now).map((p) => p.id)).toEqual(['a']);
  });
});

describe('advance', () => {
  it('increments counters and reschedules a month from now', () => {
    const now = new Date('2026-06-27T09:00:00.000Z');
    const result = advance(
      { chargesCount: 2, totalChargedCents: 5000 },
      2500,
      now,
    );
    expect(result.chargesCount).toBe(3);
    expect(result.totalChargedCents).toBe(7500);
    expect(result.lastChargedAt).toEqual(now);
    expect(result.nextRunAt.toISOString()).toBe('2026-07-27T09:00:00.000Z');
  });
});
