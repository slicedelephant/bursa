import { FunnelReport } from '../../../core/models';
import { funnelBars, HIGH_DROP_OFF_PCT, overallLabel } from './funnel-format';

const report = (): FunnelReport => ({
  steps: [
    { key: 'gallery_view', label: 'Gallery view', count: 100, conversionPct: 100, dropOffPct: 0 },
    { key: 'campaign_view', label: 'Campaign view', count: 40, conversionPct: 40, dropOffPct: 60 },
    { key: 'donate_success', label: 'Done', count: 1, conversionPct: 1, dropOffPct: 20 },
  ],
  overallConversionPct: 1,
});

describe('funnel-format', () => {
  it('maps each step to a bar with a clamped width', () => {
    const bars = funnelBars(report());
    expect(bars[0].widthPercent).toBe('100%');
    expect(bars[1].widthPercent).toBe('40%');
    // 1% conversion clamps up to the 2% minimum so the bar stays visible
    expect(bars[2].widthPercent).toBe('2%');
  });

  it('flags steps with high drop-off', () => {
    const bars = funnelBars(report());
    expect(bars[1].highDropOff).toBe(true); // 60% >= threshold
    expect(bars[2].highDropOff).toBe(false); // 20% < threshold
    expect(HIGH_DROP_OFF_PCT).toBeGreaterThan(0);
  });

  it('summarises overall conversion', () => {
    expect(overallLabel(report())).toBe('1% overall conversion');
  });

  it('handles an empty funnel', () => {
    expect(funnelBars({ steps: [], overallConversionPct: 0 })).toEqual([]);
  });
});
