// Pure presentation helpers for the system-metrics + payment-alert panel and the
// health badge. No Angular, no I/O.

import { AlertSeverity, HealthReport, ObsMetrics } from '../../../core/models';

export interface MetricTile {
  readonly label: string;
  readonly value: string;
}

export function metricTiles(m: ObsMetrics): MetricTile[] {
  return [
    { label: 'Requests', value: String(m.totalRequests) },
    { label: 'Error rate', value: `${m.errorRatePct}%` },
    { label: 'Latency p50', value: `${m.p50Ms} ms` },
    { label: 'Latency p95', value: `${m.p95Ms} ms` },
    { label: 'Payments', value: String(m.paymentTotal) },
    { label: 'Payment failures', value: `${m.paymentFailureRatePct}%` },
  ];
}

/** Tailwind text colour for an error-rate value (green/amber/red). */
export function errorRateClass(pct: number): string {
  if (pct >= 5) return 'text-brand-orange';
  if (pct >= 1) return 'text-amber-500';
  return 'text-brand-green';
}

export function severityClass(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    case 'warning':
      return 'bg-amber-50 text-amber-700 ring-amber-300';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

export function healthLabel(report: HealthReport): string {
  return report.status === 'ok' ? 'All systems operational' : 'Degraded — DB unreachable';
}

export function healthClass(report: HealthReport): string {
  return report.status === 'ok' ? 'text-brand-green' : 'text-brand-orange';
}

/** Human-readable uptime, e.g. "1h 02m" or "45s". */
export function formatUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}
