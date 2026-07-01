import { DiversityAggregate } from '../esg/diversity-aggregator';
import { ProgramOutcome } from './outcome-aggregator';
import {
  ReportView,
  reportPdfTitle,
  toReportCsv,
  toReportPdfLines,
} from './report-builder';

const outcome: ProgramOutcome = {
  total: 4,
  awarded: 0,
  enrolled: 1,
  graduated: 1,
  working: 1,
  withdrawn: 1,
  alumni: 2,
  retentionRate: 75,
  graduationRate: 50,
};

const diversity: DiversityAggregate = {
  scholarCount: 4,
  genderCounts: { FEMALE: 2, MALE: 1, NON_BINARY: 0, UNDISCLOSED: 1 },
  femaleSharePct: 50,
  countryCounts: { NG: 2, KE: 1, IN: 1 },
  countriesReached: 3,
  ageBandCounts: { UNDER_25: 0, '25_29': 2, '30_34': 2, '35_PLUS': 0, UNKNOWN: 0 },
  firstGenSharePct: 66.7,
};

const view: ReportView = {
  programName: 'Acme Future Leaders',
  cycleYear: 2026,
  outcome,
  diversity,
};

describe('toReportCsv', () => {
  it('emits a Metric,Value CSV with a trailing newline', () => {
    const csv = toReportCsv(view);
    expect(csv.startsWith('Metric,Value\n')).toBe(true);
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('includes outcome and diversity rows', () => {
    const csv = toReportCsv(view);
    expect(csv).toContain('Retention rate %,75');
    expect(csv).toContain('Female share %,50');
    expect(csv).toContain('Countries reached,3');
  });

  it('quotes a program name containing a comma', () => {
    const csv = toReportCsv({ ...view, programName: 'Acme, Inc.' });
    expect(csv).toContain('"Acme, Inc."');
  });
});

describe('toReportPdfLines', () => {
  it('lists outcome and diversity metrics', () => {
    const lines = toReportPdfLines(view);
    expect(lines).toContain('- Graduated: 1');
    expect(lines).toContain('- Female share: 50%');
    expect(lines.some((l) => l.includes('First-generation share: 66.7%'))).toBe(true);
  });
});

describe('reportPdfTitle', () => {
  it('builds a titled heading', () => {
    expect(reportPdfTitle(view)).toBe('Acme Future Leaders — Impact Report 2026');
  });
});
