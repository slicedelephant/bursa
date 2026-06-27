/**
 * Pure system-metrics aggregation over request samples. No I/O, no mutation:
 * computes request volume, error rate, latency percentiles and the payment-path
 * failure rate. Errors are any response status >= `errorStatusFloor` (default 500);
 * 4xx are client errors and not counted as system failures.
 */

export interface RequestSample {
  readonly route: string;
  readonly method: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly isPaymentPath: boolean;
  readonly timestamp: number;
}

export interface MetricsSnapshot {
  readonly totalRequests: number;
  readonly errorCount: number;
  readonly errorRatePct: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly paymentTotal: number;
  readonly paymentFailed: number;
  readonly paymentFailureRatePct: number;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** Nearest-rank percentile over a copy of the values (input never mutated). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

/** A payment request counts as failed when its status indicates a decline/error (>= 400). */
function isPaymentFailure(sample: RequestSample): boolean {
  return sample.isPaymentPath && sample.statusCode >= 400;
}

export function aggregate(
  samples: readonly RequestSample[],
  errorStatusFloor = 500,
): MetricsSnapshot {
  const total = samples.length;
  const errorCount = samples.filter((s) => s.statusCode >= errorStatusFloor).length;
  const durations = samples.map((s) => s.durationMs);
  const payment = samples.filter((s) => s.isPaymentPath);
  const paymentFailed = samples.filter(isPaymentFailure).length;

  return {
    totalRequests: total,
    errorCount,
    errorRatePct: pct(errorCount, total),
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    paymentTotal: payment.length,
    paymentFailed,
    paymentFailureRatePct: pct(paymentFailed, payment.length),
  };
}
