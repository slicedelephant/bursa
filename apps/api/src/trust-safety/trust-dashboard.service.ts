import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import { buildTrustDashboard } from './dashboard-aggregation';
import { buildRiskHeatMap } from './risk-heat-map';

const AUDIT_EXPORT_LIMIT = 1000;
const SIGNAL_LIMIT = 1000;

/**
 * Read-only trust operator dashboard (E9). Aggregates the trust tables through
 * the pure cores (`dashboard-aggregation`, `risk-heat-map`) — same read-only
 * derivation pattern as E7 `PaymentMonitorService`. The audit CSV is built from
 * the reused E6 AuditLog.
 */
@Injectable()
export class TrustDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard(now: Date = new Date()) {
    const [
      fraudSignals,
      chargebacks,
      totalDonations,
      moderationCases,
      flags,
      frozenCampaigns,
      frozenDonors,
    ] = await Promise.all([
      this.prisma.fraudSignal.findMany({
        select: { kind: true, riskLevel: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: SIGNAL_LIMIT,
      }),
      this.prisma.chargeback.findMany({
        select: { status: true, refundOffered: true },
      }),
      this.prisma.donation.count(),
      this.prisma.moderationCase.findMany({
        select: { status: true, riskLevel: true },
      }),
      this.prisma.campaignFlag.findMany({
        select: { reason: true, status: true },
      }),
      this.prisma.campaign.count({ where: { frozen: true } }),
      this.prisma.user.count({ where: { frozen: true } }),
    ]);

    return buildTrustDashboard({
      fraudSignals,
      chargebacks,
      totalDonations,
      moderationCases,
      flags,
      frozenCampaigns,
      frozenDonors,
      now,
    });
  }

  async heatMap() {
    const [donations, signals, chargebacks] = await Promise.all([
      this.prisma.donation.findMany({ select: { donorCountry: true } }),
      this.prisma.fraudSignal.findMany({
        select: { donation: { select: { donorCountry: true } } },
      }),
      this.prisma.chargeback.findMany({
        select: { donation: { select: { donorCountry: true } } },
      }),
    ]);

    return {
      rows: buildRiskHeatMap({
        donations: donations.map((d) => ({ country: d.donorCountry })),
        signals: signals.map((s) => ({ country: s.donation?.donorCountry })),
        chargebacks: chargebacks.map((c) => ({
          country: c.donation?.donorCountry,
        })),
      }),
    };
  }

  /** CSV export of every moderation action from the reused E6 AuditLog. */
  async auditCsv(): Promise<string> {
    const entries = await this.audit.list(undefined, AUDIT_EXPORT_LIMIT);
    const moderation = entries.filter((e) =>
      e.action.startsWith('moderation.'),
    );
    const header = 'createdAt,action,actorUserId,targetType,targetId,result';
    const rows = moderation.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      return [
        e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
        e.action,
        e.actorUserId ?? '',
        e.targetType ?? '',
        e.targetId ?? '',
        meta.result ?? '',
      ]
        .map((v) => csvCell(String(v)))
        .join(',');
    });
    return [header, ...rows].join('\n');
  }
}

/** Minimal CSV cell escaping (quote when it contains a comma/quote/newline). */
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
