import { aggregate, percentile, RequestSample } from './metrics-aggregate';

const sample = (over: Partial<RequestSample> = {}): RequestSample => ({
  route: 'GET /campaigns',
  method: 'GET',
  statusCode: 200,
  durationMs: 10,
  isPaymentPath: false,
  timestamp: 0,
  ...over,
});

describe('percentile', () => {
  it('returns 0 for empty input', () => {
    expect(percentile([], 95)).toBe(0);
  });

  it('computes nearest-rank percentiles without mutating input', () => {
    const values = [30, 10, 20, 40, 50];
    expect(percentile(values, 50)).toBe(30);
    expect(percentile(values, 95)).toBe(50);
    expect(values).toEqual([30, 10, 20, 40, 50]);
  });
});

describe('aggregate', () => {
  it('returns a zeroed snapshot for no samples', () => {
    const snap = aggregate([]);
    expect(snap).toEqual({
      totalRequests: 0,
      errorCount: 0,
      errorRatePct: 0,
      p50Ms: 0,
      p95Ms: 0,
      paymentTotal: 0,
      paymentFailed: 0,
      paymentFailureRatePct: 0,
    });
  });

  it('counts only >= 500 as system errors (4xx are client errors)', () => {
    const snap = aggregate([
      sample({ statusCode: 200 }),
      sample({ statusCode: 404 }),
      sample({ statusCode: 500 }),
      sample({ statusCode: 503 }),
    ]);
    expect(snap.totalRequests).toBe(4);
    expect(snap.errorCount).toBe(2);
    expect(snap.errorRatePct).toBe(50);
  });

  it('computes payment failure rate from payment-path declines (>= 400)', () => {
    const snap = aggregate([
      sample({ isPaymentPath: true, statusCode: 200 }),
      sample({ isPaymentPath: true, statusCode: 402 }),
      sample({ isPaymentPath: true, statusCode: 200 }),
      sample({ isPaymentPath: false, statusCode: 402 }),
    ]);
    expect(snap.paymentTotal).toBe(3);
    expect(snap.paymentFailed).toBe(1);
    expect(snap.paymentFailureRatePct).toBe(33.3);
  });

  it('computes latency percentiles', () => {
    const snap = aggregate([
      sample({ durationMs: 5 }),
      sample({ durationMs: 15 }),
      sample({ durationMs: 100 }),
    ]);
    expect(snap.p50Ms).toBe(15);
    expect(snap.p95Ms).toBe(100);
  });

  it('respects a custom error floor', () => {
    const snap = aggregate([sample({ statusCode: 404 })], 400);
    expect(snap.errorCount).toBe(1);
  });
});
