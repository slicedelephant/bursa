/**
 * E9 Trust-and-Safety — pure dashboard aggregation.
 *
 * Folds the raw trust tables (fraud signals, chargebacks, moderation cases,
 * flags) into the operator dashboard view: fraud trend + breakdown, chargeback
 * rate, moderation backlog and flag counts. Read-only, pure, no mutation — the
 * owning service just passes plain rows in (same split as E7
 * `PaymentMonitorService` ↔ `derivePaymentAlerts`).
 */

export interface DashboardSignal {
  readonly kind: string;
  readonly riskLevel: string;
  readonly createdAt: Date | number;
}

export interface DashboardChargeback {
  readonly status: string;
  readonly refundOffered?: boolean;
}

export interface DashboardModerationCase {
  readonly status: string;
  readonly riskLevel: string;
}

export interface DashboardFlag {
  readonly reason: string;
  readonly status: string;
}

export interface DashboardInput {
  readonly fraudSignals: readonly DashboardSignal[];
  readonly chargebacks: readonly DashboardChargeback[];
  readonly totalDonations: number;
  readonly moderationCases: readonly DashboardModerationCase[];
  readonly flags: readonly DashboardFlag[];
  readonly frozenCampaigns: number;
  readonly frozenDonors: number;
  readonly now?: Date | number;
  readonly trendDays?: number;
}

export interface CountRow {
  readonly key: string;
  readonly count: number;
}

export interface TrendPoint {
  readonly date: string;
  readonly count: number;
}

export interface TrustDashboard {
  readonly fraud: {
    readonly totalSignals: number;
    readonly highRiskSignals: number;
    readonly byKind: CountRow[];
    readonly trend: TrendPoint[];
  };
  readonly chargebacks: {
    readonly open: number;
    readonly total: number;
    readonly chargebackRatePct: number;
    readonly refundOffered: number;
    readonly byStatus: CountRow[];
  };
  readonly moderation: {
    readonly backlog: number;
    readonly openCases: number;
    readonly escalated: number;
    readonly byLevel: CountRow[];
  };
  readonly flags: {
    readonly open: number;
    readonly total: number;
    readonly byReason: CountRow[];
  };
  readonly frozen: {
    readonly campaigns: number;
    readonly donors: number;
  };
}

function toMillis(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function countBy<T>(items: readonly T[], pick: (item: T) => string): CountRow[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = pick(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const HIGH_RISK = new Set(['HIGH', 'CRITICAL']);
const DAY_MS = 86_400_000;

export function buildTrustDashboard(input: DashboardInput): TrustDashboard {
  const now = input.now !== undefined ? toMillis(input.now) : Date.now();
  const trendDays = input.trendDays ?? 7;

  // Fraud trend: one bucket per day for the last `trendDays`, oldest first.
  const trend: TrendPoint[] = [];
  for (let i = trendDays - 1; i >= 0; i -= 1) {
    const date = dayKey(now - i * DAY_MS);
    const count = input.fraudSignals.filter(
      (s) => dayKey(toMillis(s.createdAt)) === date,
    ).length;
    trend.push({ date, count });
  }

  const highRiskSignals = input.fraudSignals.filter((s) =>
    HIGH_RISK.has(s.riskLevel),
  ).length;

  const chargebackTotal = input.chargebacks.length;
  const chargebackOpen = input.chargebacks.filter(
    (c) => c.status === 'OPEN',
  ).length;
  const refundOffered = input.chargebacks.filter((c) => c.refundOffered).length;
  const chargebackRatePct =
    input.totalDonations > 0
      ? Math.round((chargebackTotal / input.totalDonations) * 1000) / 10
      : 0;

  const openCases = input.moderationCases.filter(
    (m) => m.status === 'OPEN',
  ).length;
  const escalated = input.moderationCases.filter(
    (m) => m.status === 'ESCALATED',
  ).length;

  const openFlags = input.flags.filter((f) => f.status === 'OPEN').length;

  return {
    fraud: {
      totalSignals: input.fraudSignals.length,
      highRiskSignals,
      byKind: countBy(input.fraudSignals, (s) => s.kind),
      trend,
    },
    chargebacks: {
      open: chargebackOpen,
      total: chargebackTotal,
      chargebackRatePct,
      refundOffered,
      byStatus: countBy(input.chargebacks, (c) => c.status),
    },
    moderation: {
      backlog: openCases + escalated,
      openCases,
      escalated,
      byLevel: countBy(input.moderationCases, (m) => m.riskLevel),
    },
    flags: {
      open: openFlags,
      total: input.flags.length,
      byReason: countBy(input.flags, (f) => f.reason),
    },
    frozen: {
      campaigns: input.frozenCampaigns,
      donors: input.frozenDonors,
    },
  };
}
