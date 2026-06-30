import { RequestSample } from './metrics-aggregate';
import { MetricsService } from './metrics.service';
import { MetricsStore } from './metrics.store';

const sample = (over: Partial<RequestSample> = {}): RequestSample => ({
  route: 'GET /campaigns',
  method: 'GET',
  statusCode: 200,
  durationMs: 10,
  isPaymentPath: false,
  timestamp: Date.now(),
  ...over,
});

describe('MetricsService', () => {
  function make() {
    const store = new MetricsStore();
    return { store, service: new MetricsService(store) };
  }

  it('records via the store and snapshots through the aggregator', () => {
    const { service } = make();
    service.record(sample({ statusCode: 200 }));
    service.record(sample({ statusCode: 500 }));
    const snap = service.snapshot();
    expect(snap.totalRequests).toBe(2);
    expect(snap.errorCount).toBe(1);
    expect(snap.errorRatePct).toBe(50);
  });

  it('counts webhook-route failures only', () => {
    const { service } = make();
    service.record(
      sample({ route: 'POST /payments/webhook', statusCode: 400 }),
    );
    service.record(
      sample({ route: 'POST /payments/webhook', statusCode: 200 }),
    );
    service.record(
      sample({ route: 'POST /campaigns/x/donations/card', statusCode: 402 }),
    );
    expect(service.webhookFailures()).toBe(1);
  });

  it('builds SLO windows from recent samples and stays healthy when good', () => {
    const { service } = make();
    const now = 10 * 60_000;
    for (let i = 0; i < 100; i++) {
      service.record(sample({ statusCode: 200, timestamp: now - 1000 }));
    }
    const report = service.slo(99.9, now);
    expect(report.alert).toBe('none');
    expect(report.windows.find((w) => w.windowLabel === 'fast')?.sliPct).toBe(
      100,
    );
  });

  it('evaluates SLO with default objective and clock without throwing', () => {
    const { service } = make();
    service.record(sample({ statusCode: 200 }));
    const report = service.slo();
    expect(report.objectivePct).toBe(99.9);
  });

  it('pages when recent failures blow the fast burn rate', () => {
    const { service } = make();
    const now = 10 * 60_000;
    // 3% errors over the last minute -> burn rate 30 in both fast windows
    for (let i = 0; i < 1000; i++) {
      const failing = i < 30;
      service.record(
        sample({ statusCode: failing ? 500 : 200, timestamp: now - 1000 }),
      );
    }
    const report = service.slo(99.9, now);
    expect(report.alert).toBe('page');
  });
});
