import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';
import { PaymentMonitorService } from './payment-monitor.service';

describe('AnalyticsController', () => {
  it('records an ingested event with user + request id and returns recorded', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const analytics = { record } as unknown as AnalyticsService;
    const health = { check: jest.fn() } as unknown as HealthService;
    const controller = new AnalyticsController(analytics, health);

    const res = await controller.track(
      { type: 'campaign_view', visitorId: 'v1' },
      'user1',
      { requestId: 'req_abc12345' },
    );
    expect(res).toEqual({ recorded: true });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'campaign_view',
        visitorId: 'v1',
        userId: 'user1',
        requestId: 'req_abc12345',
      }),
    );
  });

  it('tolerates anonymous ingest (no user, no request id)', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const controller = new AnalyticsController(
      { record } as unknown as AnalyticsService,
      { check: jest.fn() } as unknown as HealthService,
    );
    await controller.track({ type: 'gallery_view' });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, requestId: null }),
    );
  });

  it('delegates health to the health service', () => {
    const check = jest.fn().mockReturnValue({ status: 'ok' });
    const controller = new AnalyticsController(
      { record: jest.fn() } as unknown as AnalyticsService,
      { check } as unknown as HealthService,
    );
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});

describe('ObservabilityController', () => {
  function make() {
    const analytics = {
      funnel: jest
        .fn()
        .mockResolvedValue({ steps: [], overallConversionPct: 0 }),
      onboardingFunnel: jest
        .fn()
        .mockResolvedValue({ steps: [], overallConversionPct: 0 }),
    } as unknown as AnalyticsService;
    const metrics = {
      snapshot: jest.fn().mockReturnValue({ totalRequests: 5 }),
      slo: jest.fn().mockReturnValue({ alert: 'none' }),
    } as unknown as MetricsService;
    const monitor = {
      alerts: jest.fn().mockResolvedValue({ alerts: [] }),
    } as unknown as PaymentMonitorService;
    return {
      controller: new ObservabilityController(analytics, metrics, monitor),
      analytics,
      metrics,
      monitor,
    };
  }

  it('returns both donation and onboarding funnels', async () => {
    const { controller, analytics } = make();
    const out = await controller.funnel('c1');
    expect(out.donation).toBeDefined();
    expect(out.onboarding).toBeDefined();
    expect(analytics.funnel as jest.Mock).toHaveBeenCalledWith('c1');
  });

  it('defaults to the platform-wide funnel when no campaign is given', async () => {
    const { controller, analytics } = make();
    await controller.funnel();
    expect(analytics.funnel as jest.Mock).toHaveBeenCalledWith(undefined);
  });

  it('exposes metrics, slo and payment alerts', async () => {
    const { controller } = make();
    expect(controller.snapshot()).toEqual({ totalRequests: 5 });
    expect(controller.slo()).toEqual({ alert: 'none' });
    await expect(controller.paymentAlerts()).resolves.toEqual({ alerts: [] });
  });
});
