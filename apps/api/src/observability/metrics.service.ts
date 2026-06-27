import { Injectable } from '@nestjs/common';
import { aggregate, MetricsSnapshot, RequestSample } from './metrics-aggregate';
import { MetricsStore } from './metrics.store';
import { evaluateSlo, SloReport, SloWindowInput } from './slo';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const SLO_WINDOWS: ReadonlyArray<{ label: string; ms: number }> = [
  { label: 'fast', ms: HOUR },
  { label: 'fast_short', ms: 5 * MINUTE },
  { label: 'slow', ms: 6 * HOUR },
  { label: 'slow_short', ms: 30 * MINUTE },
];

const ERROR_FLOOR = 500;

/**
 * Owns the request-metrics store and turns it into the operator-facing snapshot
 * and SLO/burn-rate report. Stateless beyond the per-instance store; all maths is
 * delegated to the pure aggregators so this layer stays thin.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly store: MetricsStore) {}

  record(sample: RequestSample): void {
    this.store.record(sample);
  }

  snapshot(): MetricsSnapshot {
    return aggregate(this.store.samples(), ERROR_FLOOR);
  }

  /** Count of webhook-route requests that failed (>= 400) — feeds payment alerts. */
  webhookFailures(): number {
    return this.store
      .samples()
      .filter((s) => s.route.includes('/payments/webhook') && s.statusCode >= 400)
      .length;
  }

  slo(objectivePct = 99.9, now: number = Date.now()): SloReport {
    const windows: SloWindowInput[] = SLO_WINDOWS.map(({ label, ms }) => {
      const inWindow = this.store.since(now - ms);
      const good = inWindow.filter((s) => s.statusCode < ERROR_FLOOR).length;
      return { label, good, total: inWindow.length };
    });
    return evaluateSlo(windows, objectivePct);
  }
}
