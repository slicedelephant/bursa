import { RequestSample } from './metrics-aggregate';
import { MetricsStore } from './metrics.store';

const sample = (over: Partial<RequestSample> = {}): RequestSample => ({
  route: 'GET /x',
  method: 'GET',
  statusCode: 200,
  durationMs: 1,
  isPaymentPath: false,
  timestamp: 0,
  ...over,
});

describe('MetricsStore', () => {
  it('records and returns a defensive copy', () => {
    const store = new MetricsStore();
    store.record(sample({ timestamp: 1 }));
    const a = store.samples();
    expect(a).toHaveLength(1);
    // mutating the returned array must not affect the store
    (a as RequestSample[]).push(sample());
    expect(store.samples()).toHaveLength(1);
  });

  it('evicts the oldest sample beyond capacity', () => {
    const store = new MetricsStore(2);
    store.record(sample({ timestamp: 1 }));
    store.record(sample({ timestamp: 2 }));
    store.record(sample({ timestamp: 3 }));
    expect(store.samples().map((s) => s.timestamp)).toEqual([2, 3]);
  });

  it('filters by since(from)', () => {
    const store = new MetricsStore();
    store.record(sample({ timestamp: 10 }));
    store.record(sample({ timestamp: 20 }));
    store.record(sample({ timestamp: 30 }));
    expect(store.since(20).map((s) => s.timestamp)).toEqual([20, 30]);
  });

  it('clamps capacity to at least 1 and supports reset', () => {
    const store = new MetricsStore(0);
    store.record(sample({ timestamp: 1 }));
    store.record(sample({ timestamp: 2 }));
    expect(store.samples()).toHaveLength(1);
    store.reset();
    expect(store.samples()).toHaveLength(0);
  });
});
