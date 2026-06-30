import { RateLimitStore } from './rate-limit.store';

describe('RateLimitStore', () => {
  const LIMIT = 3;
  const WINDOW = 60_000;

  it('allows hits up to the limit then blocks', () => {
    const store = new RateLimitStore();
    const t0 = 1_000_000;
    expect(store.hit('ip:a', LIMIT, WINDOW, t0).allowed).toBe(true);
    expect(store.hit('ip:a', LIMIT, WINDOW, t0).allowed).toBe(true);
    expect(store.hit('ip:a', LIMIT, WINDOW, t0).allowed).toBe(true);
    const blocked = store.hit('ip:a', LIMIT, WINDOW, t0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('reports remaining correctly', () => {
    const store = new RateLimitStore();
    expect(store.hit('k', LIMIT, WINDOW, 0).remaining).toBe(2);
    expect(store.hit('k', LIMIT, WINDOW, 0).remaining).toBe(1);
    expect(store.hit('k', LIMIT, WINDOW, 0).remaining).toBe(0);
  });

  it('resets after the window elapses', () => {
    const store = new RateLimitStore();
    const t0 = 0;
    for (let i = 0; i < LIMIT; i++) store.hit('k', LIMIT, WINDOW, t0);
    expect(store.hit('k', LIMIT, WINDOW, t0).allowed).toBe(false);
    // exactly at resetAt the window rolls over
    const after = store.hit('k', LIMIT, WINDOW, t0 + WINDOW);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(LIMIT - 1);
  });

  it('keeps separate counters per key', () => {
    const store = new RateLimitStore();
    for (let i = 0; i < LIMIT; i++) store.hit('ip:a', LIMIT, WINDOW, 0);
    expect(store.hit('ip:a', LIMIT, WINDOW, 0).allowed).toBe(false);
    expect(store.hit('ip:b', LIMIT, WINDOW, 0).allowed).toBe(true);
  });

  it('exposes a stable resetAt within a window', () => {
    const store = new RateLimitStore();
    const first = store.hit('k', LIMIT, WINDOW, 500);
    const second = store.hit('k', LIMIT, WINDOW, 600);
    expect(first.resetAt).toBe(500 + WINDOW);
    expect(second.resetAt).toBe(500 + WINDOW);
  });

  it('prune() removes expired buckets only', () => {
    const store = new RateLimitStore();
    store.hit('old', LIMIT, WINDOW, 0);
    store.hit('new', LIMIT, WINDOW, WINDOW); // resets at 2*WINDOW
    store.prune(WINDOW + 1); // old expired (resetAt=WINDOW), new still active
    // 'old' bucket gone → fresh window, full remaining
    expect(store.hit('old', LIMIT, WINDOW, WINDOW + 1).remaining).toBe(
      LIMIT - 1,
    );
    // 'new' bucket survived → second hit, remaining decremented further
    expect(store.hit('new', LIMIT, WINDOW, WINDOW + 1).remaining).toBe(
      LIMIT - 2,
    );
  });

  it('reset() clears all buckets', () => {
    const store = new RateLimitStore();
    for (let i = 0; i < LIMIT; i++) store.hit('k', LIMIT, WINDOW, 0);
    store.reset();
    expect(store.hit('k', LIMIT, WINDOW, 0).allowed).toBe(true);
  });
});
