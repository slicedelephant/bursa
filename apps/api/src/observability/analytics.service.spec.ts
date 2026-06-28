import { PrismaService } from '../prisma/prisma.service';
import { REDACTED } from '../security/pii-redact';
import { AnalyticsService } from './analytics.service';

function makePrisma() {
  return {
    analyticsEvent: {
      create: jest.fn().mockResolvedValue({ id: 'e1' }),
      groupBy: jest.fn(),
    },
  } as unknown as PrismaService & {
    analyticsEvent: { create: jest.Mock; groupBy: jest.Mock };
  };
}

describe('AnalyticsService', () => {
  it('persists an event and redacts PII in metadata', async () => {
    const prisma = makePrisma();
    const service = new AnalyticsService(prisma);
    await service.record({
      type: 'campaign_view',
      visitorId: 'v1',
      campaignId: 'c1',
      metadata: { email: 'jane@example.com', ref: 'share' },
    });
    const data = prisma.analyticsEvent.create.mock.calls[0][0].data;
    expect(data.type).toBe('campaign_view');
    expect(data.visitorId).toBe('v1');
    expect((data.metadata as { email: string }).email).toBe(REDACTED);
    expect((data.metadata as { ref: string }).ref).toBe('share');
  });

  it('never throws when persistence fails', async () => {
    const prisma = makePrisma();
    prisma.analyticsEvent.create.mockRejectedValueOnce(new Error('db down'));
    const service = new AnalyticsService(prisma);
    await expect(service.record({ type: 'gallery_view' })).resolves.toBeUndefined();
  });

  it('builds the donation funnel from grouped counts', async () => {
    const prisma = makePrisma();
    prisma.analyticsEvent.groupBy.mockResolvedValue([
      { type: 'gallery_view', _count: { _all: 100 } },
      { type: 'campaign_view', _count: { _all: 50 } },
      { type: 'donate_start', _count: { _all: 10 } },
      { type: 'donate_success', _count: { _all: 4 } },
    ]);
    const service = new AnalyticsService(prisma);
    const report = await service.funnel();
    expect(report.steps.map((s) => s.count)).toEqual([100, 50, 10, 4]);
    expect(report.overallConversionPct).toBe(4);
  });

  it('scopes the funnel to a campaign when given', async () => {
    const prisma = makePrisma();
    prisma.analyticsEvent.groupBy.mockResolvedValue([]);
    const service = new AnalyticsService(prisma);
    await service.funnel('c1');
    expect(prisma.analyticsEvent.groupBy.mock.calls[0][0].where).toEqual({
      campaignId: 'c1',
    });
  });

  it('builds the onboarding funnel grouped by step', async () => {
    const prisma = makePrisma();
    prisma.analyticsEvent.groupBy.mockResolvedValue([
      { step: 'basics', _count: { _all: 20 } },
      { step: 'submitted', _count: { _all: 8 } },
    ]);
    const service = new AnalyticsService(prisma);
    const report = await service.onboardingFunnel();
    expect(prisma.analyticsEvent.groupBy.mock.calls[0][0].where).toEqual({
      type: 'onboarding_step',
    });
    expect(report.steps[0].count).toBe(20);
  });
});
