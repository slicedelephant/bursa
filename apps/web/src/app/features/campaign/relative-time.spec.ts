import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const base = Date.parse('2026-06-27T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const ago = (ms: number): string => new Date(base - ms).toISOString();
  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('returns empty string for null/undefined/empty input', () => {
    expect(relativeTime(null)).toBe('');
    expect(relativeTime(undefined)).toBe('');
    expect(relativeTime('')).toBe('');
  });

  it('returns empty string for an unparseable timestamp', () => {
    expect(relativeTime('not-a-date')).toBe('');
  });

  it('reports "just now" for very recent timestamps', () => {
    expect(relativeTime(ago(10 * SEC))).toBe('just now');
  });

  it('reports minutes with singular and plural', () => {
    expect(relativeTime(ago(MIN))).toBe('1 minute ago');
    expect(relativeTime(ago(5 * MIN))).toBe('5 minutes ago');
  });

  it('reports hours with singular and plural', () => {
    expect(relativeTime(ago(HOUR))).toBe('1 hour ago');
    expect(relativeTime(ago(3 * HOUR))).toBe('3 hours ago');
  });

  it('reports days with singular and plural', () => {
    expect(relativeTime(ago(DAY))).toBe('1 day ago');
    expect(relativeTime(ago(3 * DAY))).toBe('3 days ago');
  });

  it('reports months with singular and plural', () => {
    expect(relativeTime(ago(30 * DAY))).toBe('1 month ago');
    expect(relativeTime(ago(120 * DAY))).toBe('4 months ago');
  });

  it('reports years with singular and plural', () => {
    expect(relativeTime(ago(365 * DAY))).toBe('1 year ago');
    expect(relativeTime(ago(2 * 365 * DAY))).toBe('2 years ago');
  });
});
