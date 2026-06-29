import { buildSchoolDashboard, DashboardCampaignInput } from './school-dashboard';

const campaigns: DashboardCampaignInput[] = [
  { id: 'c1', title: 'MBA tuition', studentName: 'Amara', status: 'DISBURSED', goalCents: 100_000, raisedCents: 100_000, payout: { status: 'CONFIRMED' } },
  { id: 'c2', title: 'MBA tuition', studentName: 'Kofi', status: 'FUNDED', goalCents: 200_000, raisedCents: 200_000, payout: null },
  { id: 'c3', title: 'MBA tuition', studentName: 'Lin', status: 'LIVE', goalCents: 100_000, raisedCents: 25_000, payout: null },
];

const donations = [
  { amountCents: 50_000, donorCountry: 'Germany' },
  { amountCents: 50_000, donorCountry: 'Germany' },
  { amountCents: 30_000, donorCountry: 'United States' },
  { amountCents: 20_000, donorCountry: null },
];

describe('buildSchoolDashboard', () => {
  it('derives per-student rows with progress and payout status', () => {
    const dashboard = buildSchoolDashboard(campaigns, donations);
    expect(dashboard.students).toHaveLength(3);
    const lin = dashboard.students.find((s) => s.studentName === 'Lin')!;
    expect(lin.progressPct).toBe(25);
    expect(lin.payoutStatus).toBe('AWAITING_FUNDING');
    const amara = dashboard.students.find((s) => s.studentName === 'Amara')!;
    expect(amara.payoutStatus).toBe('CONFIRMED');
    expect(amara.progressPct).toBe(100);
  });

  it('totals budget, paid-out and pending amounts', () => {
    const { totals } = buildSchoolDashboard(campaigns, donations);
    expect(totals.totalStudents).toBe(3);
    expect(totals.fundedCampaigns).toBe(1); // c2 READY
    expect(totals.liveCampaigns).toBe(1); // c3 AWAITING_FUNDING
    expect(totals.totalGoalCents).toBe(400_000);
    expect(totals.totalRaisedCents).toBe(325_000);
    expect(totals.totalPaidOutCents).toBe(100_000); // c1 confirmed
    expect(totals.pendingPayoutCents).toBe(200_000); // c2 ready
  });

  it('groups donor geography and sorts by amount, mapping missing to Unknown', () => {
    const { donorGeography } = buildSchoolDashboard(campaigns, donations);
    expect(donorGeography[0]).toEqual({ country: 'Germany', donationCount: 2, amountCents: 100_000 });
    expect(donorGeography.map((r) => r.country)).toEqual(['Germany', 'United States', 'Unknown']);
  });

  it('handles an empty school with zeroed totals', () => {
    const dashboard = buildSchoolDashboard([], []);
    expect(dashboard.students).toEqual([]);
    expect(dashboard.donorGeography).toEqual([]);
    expect(dashboard.totals.totalGoalCents).toBe(0);
  });

  it('guards against a zero goal', () => {
    const dashboard = buildSchoolDashboard(
      [{ id: 'z', title: 't', studentName: 'Z', status: 'DRAFT', goalCents: 0, raisedCents: 0 }],
      [],
    );
    expect(dashboard.students[0].progressPct).toBe(0);
  });
});
