import { buildFunnel } from './funnel';
import { DONATION_FUNNEL } from './funnel-steps';

describe('buildFunnel', () => {
  it('computes conversion vs first step and drop-off vs previous step', () => {
    const report = buildFunnel(
      {
        gallery_view: 1000,
        campaign_view: 400,
        donate_start: 100,
        donate_success: 40,
      },
      DONATION_FUNNEL,
    );

    expect(report.steps.map((s) => s.count)).toEqual([1000, 400, 100, 40]);
    expect(report.steps[0].conversionPct).toBe(100);
    expect(report.steps[0].dropOffPct).toBe(0);
    expect(report.steps[1].conversionPct).toBe(40); // 400/1000
    expect(report.steps[1].dropOffPct).toBe(60); // lost 600 of 1000
    expect(report.steps[3].conversionPct).toBe(4); // 40/1000
    expect(report.overallConversionPct).toBe(4);
  });

  it('handles a zero first step without dividing by zero', () => {
    const report = buildFunnel({}, DONATION_FUNNEL);
    expect(report.overallConversionPct).toBe(0);
    expect(report.steps.every((s) => s.count === 0)).toBe(true);
    expect(report.steps.every((s) => s.conversionPct === 0)).toBe(true);
  });

  it('treats missing keys as zero and never returns negative drop-off', () => {
    const report = buildFunnel(
      { gallery_view: 10, donate_success: 5 },
      DONATION_FUNNEL,
    );
    // campaign_view missing -> 0; drop-off never negative even if later step > prev
    expect(report.steps[1].count).toBe(0);
    expect(report.steps.every((s) => s.dropOffPct >= 0)).toBe(true);
  });

  it('returns an empty report for no steps', () => {
    const report = buildFunnel({ a: 1 }, []);
    expect(report.steps).toEqual([]);
    expect(report.overallConversionPct).toBe(0);
  });
});
