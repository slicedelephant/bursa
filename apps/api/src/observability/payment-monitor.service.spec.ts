import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { PaymentMonitorService } from './payment-monitor.service';

function makePrisma(statuses: string[], stuck: number) {
  return {
    donation: {
      findMany: jest
        .fn()
        .mockResolvedValue(statuses.map((status) => ({ status }))),
      count: jest.fn().mockResolvedValue(stuck),
    },
  } as unknown as PrismaService & {
    donation: { findMany: jest.Mock; count: jest.Mock };
  };
}

function makeMetrics(webhookFailures: number) {
  return { webhookFailures: () => webhookFailures } as unknown as MetricsService;
}

describe('PaymentMonitorService', () => {
  it('derives a card decline wave from recent donations', async () => {
    const statuses = [
      ...Array(8).fill('FAILED'),
      ...Array(12).fill('CAPTURED'),
    ];
    const prisma = makePrisma(statuses, 0);
    const service = new PaymentMonitorService(prisma, makeMetrics(0));
    const { alerts } = await service.alerts();
    expect(alerts.find((a) => a.kind === 'card_decline_wave')?.value).toBe(40);
  });

  it('queries stuck pledges with a cutoff and surfaces them', async () => {
    const prisma = makePrisma([], 3);
    const service = new PaymentMonitorService(prisma, makeMetrics(0));
    const now = new Date('2026-06-27T12:00:00Z');
    const { alerts } = await service.alerts(now);
    const where = prisma.donation.count.mock.calls[0][0].where;
    expect(where.status).toBe('PLEDGED');
    expect(where.createdAt.lt).toBeInstanceOf(Date);
    expect(where.createdAt.lt.getTime()).toBeLessThan(now.getTime());
    expect(alerts.find((a) => a.kind === 'stuck_pledges')?.value).toBe(3);
  });

  it('passes webhook failures from the metrics service', async () => {
    const prisma = makePrisma([], 0);
    const service = new PaymentMonitorService(prisma, makeMetrics(2));
    const { alerts } = await service.alerts();
    expect(alerts.find((a) => a.kind === 'webhook_failure')?.value).toBe(2);
  });

  it('returns no alerts when healthy', async () => {
    const prisma = makePrisma(['CAPTURED', 'CAPTURED'], 0);
    const service = new PaymentMonitorService(prisma, makeMetrics(0));
    const { alerts } = await service.alerts();
    expect(alerts).toEqual([]);
  });

  it('honours a custom card lookback sample', async () => {
    const prisma = makePrisma([], 0);
    const service = new PaymentMonitorService(prisma, makeMetrics(0));
    await service.alerts(new Date(), 100);
    expect(prisma.donation.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('falls back to the default sample for non-positive input', async () => {
    const prisma = makePrisma([], 0);
    const service = new PaymentMonitorService(prisma, makeMetrics(0));
    await service.alerts(new Date(), 0);
    expect(prisma.donation.findMany.mock.calls[0][0].take).toBe(25);
  });
});
