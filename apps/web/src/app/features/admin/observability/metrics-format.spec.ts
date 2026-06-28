import { HealthReport, ObsMetrics } from '../../../core/models';
import {
  errorRateClass,
  formatUptime,
  healthClass,
  healthLabel,
  metricTiles,
  severityClass,
} from './metrics-format';

const metrics: ObsMetrics = {
  totalRequests: 980,
  errorCount: 7,
  errorRatePct: 0.7,
  p50Ms: 12,
  p95Ms: 84,
  paymentTotal: 40,
  paymentFailed: 2,
  paymentFailureRatePct: 5,
};

describe('metrics-format', () => {
  it('produces six labelled tiles with units', () => {
    const tiles = metricTiles(metrics);
    expect(tiles).toHaveLength(6);
    expect(tiles.find((t) => t.label === 'Latency p95')?.value).toBe('84 ms');
    expect(tiles.find((t) => t.label === 'Payment failures')?.value).toBe('5%');
  });

  it('colours the error rate by severity', () => {
    expect(errorRateClass(0.2)).toContain('green');
    expect(errorRateClass(2)).toContain('amber');
    expect(errorRateClass(9)).toContain('orange');
  });

  it('maps alert severity to a chip class', () => {
    expect(severityClass('critical')).toContain('orange');
    expect(severityClass('warning')).toContain('amber');
    expect(severityClass('info')).toContain('slate2');
  });

  it('labels health states', () => {
    const ok: HealthReport = { status: 'ok', uptimeSeconds: 10, checks: { db: true } };
    const bad: HealthReport = { status: 'degraded', uptimeSeconds: 10, checks: { db: false } };
    expect(healthLabel(ok)).toContain('operational');
    expect(healthClass(ok)).toContain('green');
    expect(healthLabel(bad)).toContain('Degraded');
    expect(healthClass(bad)).toContain('orange');
  });

  it('formats uptime across magnitudes', () => {
    expect(formatUptime(45)).toBe('45s');
    expect(formatUptime(125)).toBe('2m 05s');
    expect(formatUptime(3720)).toBe('1h 02m');
    expect(formatUptime(-5)).toBe('0s');
  });
});
