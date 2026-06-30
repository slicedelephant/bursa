import { TestBed } from '@angular/core/testing';
import { HealthReport, ObsMetrics, PaymentAlert } from '../../../core/models';
import { MetricsPanelComponent } from './metrics-panel.component';

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

describe('MetricsPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsPanelComponent],
    }).compileComponents();
  });

  function render(alerts: PaymentAlert[] = [], health: HealthReport | null = null) {
    const fixture = TestBed.createComponent(MetricsPanelComponent);
    fixture.componentRef.setInput('metrics', metrics);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.componentRef.setInput('health', health);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders metric tiles', () => {
    const el = render();
    expect(el.textContent).toContain('Latency p95');
    expect(el.textContent).toContain('84 ms');
  });

  it('shows the healthy state when no alerts', () => {
    const el = render([]);
    expect(el.textContent).toContain('No active payment alerts');
  });

  it('lists payment alerts with severity', () => {
    const el = render([
      {
        kind: 'card_decline_wave',
        severity: 'critical',
        message: 'Card failure rate 60%',
        value: 60,
      },
    ]);
    expect(el.textContent).toContain('Card failure rate 60%');
    expect(el.textContent?.toLowerCase()).toContain('critical');
  });

  it('renders the health badge with uptime when provided', () => {
    const el = render([], { status: 'ok', uptimeSeconds: 3720, checks: { db: true } });
    expect(el.textContent).toContain('operational');
    expect(el.textContent).toContain('1h 02m');
  });
});
