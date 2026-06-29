import { buildTrustDashboard } from './dashboard-aggregation';

describe('dashboard-aggregation', () => {
  const now = new Date('2026-06-29T12:00:00.000Z');
  const nowMs = now.getTime();

  it('builds an empty dashboard', () => {
    const dash = buildTrustDashboard({
      fraudSignals: [],
      chargebacks: [],
      totalDonations: 0,
      moderationCases: [],
      flags: [],
      frozenCampaigns: 0,
      frozenDonors: 0,
      now,
    });
    expect(dash.fraud.totalSignals).toBe(0);
    expect(dash.chargebacks.chargebackRatePct).toBe(0);
    expect(dash.moderation.backlog).toBe(0);
    expect(dash.fraud.trend).toHaveLength(7);
  });

  it('aggregates fraud signals by kind and high-risk count', () => {
    const dash = buildTrustDashboard({
      fraudSignals: [
        { kind: 'CARD_TESTING', riskLevel: 'CRITICAL', createdAt: nowMs },
        { kind: 'DONOR_RISK', riskLevel: 'HIGH', createdAt: nowMs },
        { kind: 'CARD_TESTING', riskLevel: 'LOW', createdAt: nowMs },
      ],
      chargebacks: [],
      totalDonations: 100,
      moderationCases: [],
      flags: [],
      frozenCampaigns: 0,
      frozenDonors: 0,
      now,
    });
    expect(dash.fraud.totalSignals).toBe(3);
    expect(dash.fraud.highRiskSignals).toBe(2);
    expect(dash.fraud.byKind[0]).toEqual({ key: 'CARD_TESTING', count: 2 });
  });

  it('computes chargeback rate and breakdown', () => {
    const dash = buildTrustDashboard({
      fraudSignals: [],
      chargebacks: [
        { status: 'OPEN' },
        { status: 'REFUND_OFFERED', refundOffered: true },
        { status: 'WON' },
      ],
      totalDonations: 200,
      moderationCases: [],
      flags: [],
      frozenCampaigns: 0,
      frozenDonors: 0,
      now,
    });
    expect(dash.chargebacks.total).toBe(3);
    expect(dash.chargebacks.open).toBe(1);
    expect(dash.chargebacks.refundOffered).toBe(1);
    expect(dash.chargebacks.chargebackRatePct).toBe(1.5);
  });

  it('computes moderation backlog and flag/frozen counts', () => {
    const dash = buildTrustDashboard({
      fraudSignals: [],
      chargebacks: [],
      totalDonations: 10,
      moderationCases: [
        { status: 'OPEN', riskLevel: 'HIGH' },
        { status: 'ESCALATED', riskLevel: 'CRITICAL' },
        { status: 'APPROVED', riskLevel: 'LOW' },
      ],
      flags: [
        { reason: 'SCAM', status: 'OPEN' },
        { reason: 'SCAM', status: 'REVIEWED' },
        { reason: 'DUPLICATE', status: 'OPEN' },
      ],
      frozenCampaigns: 2,
      frozenDonors: 1,
      now,
    });
    expect(dash.moderation.backlog).toBe(2);
    expect(dash.moderation.openCases).toBe(1);
    expect(dash.moderation.escalated).toBe(1);
    expect(dash.flags.open).toBe(2);
    expect(dash.flags.byReason[0]).toEqual({ key: 'SCAM', count: 2 });
    expect(dash.frozen).toEqual({ campaigns: 2, donors: 1 });
  });

  it('buckets the fraud trend by day', () => {
    const dash = buildTrustDashboard({
      fraudSignals: [
        { kind: 'X', riskLevel: 'LOW', createdAt: nowMs },
        { kind: 'X', riskLevel: 'LOW', createdAt: nowMs - 86_400_000 },
      ],
      chargebacks: [],
      totalDonations: 0,
      moderationCases: [],
      flags: [],
      frozenCampaigns: 0,
      frozenDonors: 0,
      now,
      trendDays: 3,
    });
    expect(dash.fraud.trend).toHaveLength(3);
    expect(dash.fraud.trend[2]).toEqual({ date: '2026-06-29', count: 1 });
    expect(dash.fraud.trend[1]).toEqual({ date: '2026-06-28', count: 1 });
  });
});
