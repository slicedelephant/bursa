import { buildRiskHeatMap } from './risk-heat-map';

describe('risk-heat-map', () => {
  it('returns an empty array for no data', () => {
    expect(
      buildRiskHeatMap({ donations: [], signals: [], chargebacks: [] }),
    ).toEqual([]);
  });

  it('groups by normalized country and counts each dimension', () => {
    const rows = buildRiskHeatMap({
      donations: [{ country: 'de' }, { country: 'DE' }, { country: 'FR' }],
      signals: [{ country: 'DE' }],
      chargebacks: [{ country: 'FR' }],
    });
    const de = rows.find((r) => r.country === 'DE');
    const fr = rows.find((r) => r.country === 'FR');
    expect(de?.donationCount).toBe(2);
    expect(de?.signalCount).toBe(1);
    expect(fr?.chargebackCount).toBe(1);
  });

  it('folds missing countries into Unknown', () => {
    const rows = buildRiskHeatMap({
      donations: [{ country: null }, { country: '' }, { country: '  ' }],
      signals: [],
      chargebacks: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].country).toBe('Unknown');
    expect(rows[0].donationCount).toBe(3);
  });

  it('scores and sorts hottest-first', () => {
    const rows = buildRiskHeatMap({
      donations: [{ country: 'DE' }, { country: 'RU' }],
      signals: [{ country: 'RU' }, { country: 'RU' }],
      chargebacks: [{ country: 'RU' }],
    });
    expect(rows[0].country).toBe('RU');
    expect(rows[0].riskScore).toBe(60); // 2*15 + 1*30
    expect(rows[0].riskLevel).toBe('HIGH');
    expect(rows[1].country).toBe('DE');
    expect(rows[1].riskScore).toBe(0);
  });

  it('breaks ties by donation count then country name', () => {
    const rows = buildRiskHeatMap({
      donations: [
        { country: 'BB' },
        { country: 'BB' },
        { country: 'AA' },
        { country: 'CC' },
      ],
      signals: [],
      chargebacks: [],
    });
    // All risk scores equal 0 → most donations first, then alphabetical.
    expect(rows.map((r) => r.country)).toEqual(['BB', 'AA', 'CC']);
  });
});
