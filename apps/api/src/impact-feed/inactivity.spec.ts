import { detectInactivity } from './inactivity';

describe('detectInactivity', () => {
  it('treats a never-donated donor as not inactive (no streak to revive)', () => {
    const res = detectInactivity({
      lastDonationAt: null,
      now: '2026-06-15T12:00:00.000Z',
      thresholdDays: 90,
    });
    expect(res).toEqual({
      inactive: false,
      daysSince: null,
      shouldRemind: false,
    });
  });

  it('flags a donor past the threshold and should remind', () => {
    const res = detectInactivity({
      lastDonationAt: '2026-03-01T00:00:00.000Z',
      now: '2026-06-15T00:00:00.000Z',
      thresholdDays: 90,
    });
    expect(res.inactive).toBe(true);
    expect(res.shouldRemind).toBe(true);
    expect(res.daysSince).toBe(106);
  });

  it('does not flag a donor inside the threshold', () => {
    const res = detectInactivity({
      lastDonationAt: new Date('2026-06-01T00:00:00.000Z'),
      now: new Date('2026-06-15T00:00:00.000Z'),
      thresholdDays: 90,
    });
    expect(res.inactive).toBe(false);
    expect(res.shouldRemind).toBe(false);
    expect(res.daysSince).toBe(14);
  });

  it('treats exactly the threshold day as inactive', () => {
    const res = detectInactivity({
      lastDonationAt: '2026-03-17T00:00:00.000Z',
      now: '2026-06-15T00:00:00.000Z',
      thresholdDays: 90,
    });
    expect(res.daysSince).toBe(90);
    expect(res.inactive).toBe(true);
  });
});
