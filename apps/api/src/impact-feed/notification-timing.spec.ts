import { decideSendTiming } from './notification-timing';

describe('decideSendTiming', () => {
  it('allows the first send when there is no previous send', () => {
    const res = decideSendTiming({
      lastSentAt: null,
      now: '2026-06-15T12:00:00.000Z',
      minIntervalHours: 24,
    });
    expect(res).toEqual({ allowed: true, reason: 'OK' });
  });

  it('blocks a send that is too soon after the last one', () => {
    const res = decideSendTiming({
      lastSentAt: '2026-06-15T10:00:00.000Z',
      now: '2026-06-15T18:00:00.000Z',
      minIntervalHours: 24,
    });
    expect(res).toEqual({ allowed: false, reason: 'TOO_SOON' });
  });

  it('allows a send once the minimum interval has elapsed', () => {
    const res = decideSendTiming({
      lastSentAt: new Date('2026-06-14T10:00:00.000Z'),
      now: new Date('2026-06-15T12:00:00.000Z'),
      minIntervalHours: 24,
    });
    expect(res).toEqual({ allowed: true, reason: 'OK' });
  });

  it('blocks sends inside a same-day quiet-hours window', () => {
    // 13:00 local falls inside [9,17).
    const now = new Date(2026, 5, 15, 13, 0, 0);
    const res = decideSendTiming({
      lastSentAt: null,
      now,
      minIntervalHours: 0,
      quietHours: [9, 17],
    });
    expect(res).toEqual({ allowed: false, reason: 'QUIET_HOURS' });
  });

  it('blocks sends inside a wrap-around (overnight) quiet-hours window', () => {
    const now = new Date(2026, 5, 15, 2, 0, 0); // 02:00 local inside [22,6)
    const res = decideSendTiming({
      lastSentAt: null,
      now,
      minIntervalHours: 0,
      quietHours: [22, 6],
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('QUIET_HOURS');
  });

  it('allows sends outside the quiet-hours window', () => {
    const now = new Date(2026, 5, 15, 8, 0, 0); // 08:00 local, outside [22,6)
    const res = decideSendTiming({
      lastSentAt: null,
      now,
      minIntervalHours: 0,
      quietHours: [22, 6],
    });
    expect(res).toEqual({ allowed: true, reason: 'OK' });
  });

  it('treats an empty quiet-hours window (start === end) as never quiet', () => {
    const now = new Date(2026, 5, 15, 10, 0, 0);
    const res = decideSendTiming({
      lastSentAt: null,
      now,
      minIntervalHours: 0,
      quietHours: [10, 10],
    });
    expect(res.allowed).toBe(true);
  });

  it('prioritises quiet-hours over the interval check', () => {
    const now = new Date(2026, 5, 15, 23, 0, 0);
    const res = decideSendTiming({
      lastSentAt: new Date(2026, 5, 15, 22, 30, 0),
      now,
      minIntervalHours: 24,
      quietHours: [22, 6],
    });
    expect(res.reason).toBe('QUIET_HOURS');
  });
});
