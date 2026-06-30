import { EsgAggregate } from './esg-aggregate';
import {
  isReportStandard,
  mapToStandard,
  parseReportStandard,
  reportStandardLabel,
} from './esg-standard-mapper';

const aggregate: EsgAggregate = {
  investedCents: 12_500_000,
  donatedCents: 14_000_000,
  donationCount: 42,
  payoutCount: 7,
  disbursementCount: 3,
  diversity: {
    scholarCount: 57,
    genderCounts: { FEMALE: 20, MALE: 35, NON_BINARY: 2, UNDISCLOSED: 0 },
    femaleSharePct: 35.1,
    countryCounts: { Nigeria: 20, Kenya: 18, Ghana: 19 },
    countriesReached: 3,
    ageBandCounts: {
      UNDER_25: 10,
      '25_29': 30,
      '30_34': 12,
      '35_PLUS': 5,
      UNKNOWN: 0,
    },
    firstGenSharePct: 60,
  },
  categoryCounts: {
    QUALITY_EDUCATION: 5,
    GENDER_EQUALITY: 2,
    GEOGRAPHIC_REACH: 1,
    POVERTY_REDUCTION: 0,
    ECONOMIC_GROWTH: 0,
  },
  taggedCount: 8,
};

describe('esg-standard-mapper', () => {
  describe('parse/guard/label', () => {
    it('recognises every valid standard', () => {
      for (const s of ['GRI_2024', 'CSRD_ESRS', 'SASB', 'UN_SDG']) {
        expect(isReportStandard(s)).toBe(true);
        expect(parseReportStandard(s)).toBe(s);
      }
    });

    it('rejects invalid standards', () => {
      expect(isReportStandard('TCFD')).toBe(false);
      expect(() => parseReportStandard('TCFD')).toThrow('valid ReportStandard');
    });

    it('labels each standard', () => {
      expect(reportStandardLabel('UN_SDG')).toContain('Sustainable');
    });
  });

  describe('mapToStandard', () => {
    it('maps GRI metrics with EUR economic value', () => {
      const m = mapToStandard('GRI_2024', aggregate);
      const econ = m.find((x) => x.code === 'GRI 201-1')!;
      expect(econ.value).toBe(125000); // 12_500_000 cents → EUR
      expect(econ.unit).toBe('EUR');
      const div = m.find((x) => x.code === 'GRI 405-1')!;
      expect(div.value).toBe(35.1);
    });

    it('maps CSRD/ESRS metrics including governance', () => {
      const m = mapToStandard('CSRD_ESRS', aggregate);
      expect(m.map((x) => x.code)).toEqual(['ESRS S1', 'ESRS S3', 'ESRS G1']);
      expect(m.find((x) => x.code === 'ESRS G1')!.value).toBe(125000);
    });

    it('maps SASB metrics', () => {
      const m = mapToStandard('SASB', aggregate);
      expect(m.length).toBeGreaterThan(0);
      expect(m.every((x) => typeof x.value === 'number')).toBe(true);
    });

    it('maps UN SDG metrics across SDG 1/4/5/10', () => {
      const m = mapToStandard('UN_SDG', aggregate);
      expect(m.map((x) => x.code)).toEqual([
        'SDG 1',
        'SDG 4',
        'SDG 5',
        'SDG 10',
      ]);
      expect(m.find((x) => x.code === 'SDG 4')!.value).toBe(57); // scholars
    });

    it('returns finite numbers even for an empty aggregate', () => {
      const empty: EsgAggregate = {
        ...aggregate,
        investedCents: 0,
        diversity: {
          ...aggregate.diversity,
          scholarCount: 0,
          femaleSharePct: 0,
        },
      };
      const m = mapToStandard('GRI_2024', empty);
      expect(m.every((x) => Number.isFinite(x.value))).toBe(true);
    });
  });
});
