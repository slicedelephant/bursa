import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthReport {
  readonly status: 'ok' | 'degraded';
  readonly uptimeSeconds: number;
  readonly checks: { readonly db: boolean };
}

/**
 * Liveness + readiness probe for external synthetic/uptime monitoring. A cheap
 * `SELECT 1` confirms the DB is reachable. The endpoint always answers 200 so the
 * monitor can read the structured status; `degraded` signals a failed DB check.
 */
@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(now: number = Date.now()): Promise<HealthReport> {
    let db = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = false;
    }
    return {
      status: db ? 'ok' : 'degraded',
      uptimeSeconds: Math.max(0, Math.floor((now - this.startedAt) / 1000)),
      checks: { db },
    };
  }
}
