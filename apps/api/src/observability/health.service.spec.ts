import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

function makePrisma(ok: boolean) {
  return {
    $queryRaw: ok
      ? jest.fn().mockResolvedValue([{ '?column?': 1 }])
      : jest.fn().mockRejectedValue(new Error('no db')),
  } as unknown as PrismaService;
}

describe('HealthService', () => {
  it('reports ok when the DB probe succeeds', async () => {
    const service = new HealthService(makePrisma(true));
    const report = await service.check();
    expect(report.status).toBe('ok');
    expect(report.checks.db).toBe(true);
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports degraded when the DB probe fails', async () => {
    const service = new HealthService(makePrisma(false));
    const report = await service.check();
    expect(report.status).toBe('degraded');
    expect(report.checks.db).toBe(false);
  });

  it('computes a non-negative uptime', async () => {
    const service = new HealthService(makePrisma(true));
    const report = await service.check(Date.now() + 5000);
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(5);
  });
});
