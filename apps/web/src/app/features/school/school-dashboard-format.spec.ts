import {
  dashboardTiles,
  formatEur,
  geographyBars,
  payoutStatusClass,
  payoutStatusLabel,
} from './school-dashboard-format';

describe('school-dashboard-format', () => {
  it('formats cents as whole euros', () => {
    expect(formatEur(100_000)).toContain('1,000');
    expect(formatEur(0)).toContain('0');
  });

  it('labels and classes payout statuses', () => {
    expect(payoutStatusLabel('CONFIRMED')).toBe('Received by school');
    expect(payoutStatusLabel('READY')).toBe('Ready to disburse');
    expect(payoutStatusLabel('X' as never)).toBe('Unknown');
    expect(payoutStatusClass('SENT')).toContain('brand-green');
    expect(payoutStatusClass('READY')).toContain('brand-blue');
    expect(payoutStatusClass('AWAITING_FUNDING')).toContain('amber');
    expect(payoutStatusClass('NONE')).toContain('slate');
  });

  it('builds four KPI tiles', () => {
    const tiles = dashboardTiles({
      totalStudents: 3,
      liveCampaigns: 1,
      fundedCampaigns: 1,
      totalGoalCents: 400_000,
      totalRaisedCents: 325_000,
      totalPaidOutCents: 100_000,
      pendingPayoutCents: 200_000,
    });
    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toEqual({ label: 'Students', value: '3' });
    expect(tiles[2].label).toBe('Paid out to school');
  });

  it('scales geography bars against the largest amount', () => {
    const bars = geographyBars([
      { country: 'Germany', donationCount: 2, amountCents: 100_000 },
      { country: 'Kenya', donationCount: 1, amountCents: 1_000 },
    ]);
    expect(bars[0].widthPercent).toBe('100%');
    expect(bars[1].widthPercent).toBe('2%'); // clamped up to the 2% minimum
    expect(bars[0].amountLabel).toContain('1,000');
  });

  it('handles an empty geography list', () => {
    expect(geographyBars([])).toEqual([]);
  });

  it('renders a zero-width bar when all amounts are zero', () => {
    const bars = geographyBars([{ country: 'Nowhere', donationCount: 0, amountCents: 0 }]);
    expect(bars[0].widthPercent).toBe('0%');
  });
});
