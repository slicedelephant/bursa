import { EsgRow, computeEsgMetrics, toCsv } from './esg.util';

const row = (over: Partial<EsgRow> = {}): EsgRow => ({
  campaignTitle: 'Help Amara study',
  studentName: 'Amara Okonkwo',
  studentCountry: 'Nigeria',
  schoolName: 'INSEAD',
  amountCents: 100_000,
  tier: 'FULL',
  scholarshipName: null,
  fullTuition: false,
  recognitionKind: 'ANONYMOUS',
  createdAt: new Date('2026-06-01T10:00:00Z'),
  ...over,
});

describe('computeEsgMetrics', () => {
  it('aggregates distinct students, countries, schools and totals', () => {
    const m = computeEsgMetrics([
      row({
        studentName: 'Amara',
        studentCountry: 'Nigeria',
        schoolName: 'INSEAD',
        amountCents: 100_000,
        fullTuition: true,
        scholarshipName: 'The Acme Scholarship',
      }),
      row({
        studentName: 'Kwame',
        studentCountry: 'Ghana',
        schoolName: 'INSEAD',
        amountCents: 50_000,
      }),
      row({
        studentName: 'Amara',
        studentCountry: 'Nigeria',
        schoolName: 'INSEAD',
        amountCents: 25_000,
      }),
    ]);
    expect(m.studentsSupported).toBe(2);
    expect(m.countriesReached).toBe(2);
    expect(m.schoolsSupported).toBe(1);
    expect(m.totalCommittedCents).toBe(175_000);
    expect(m.fullScholarships).toBe(1);
    expect(m.namedScholarships).toBe(1);
  });

  it('returns zeroed metrics for no rows', () => {
    expect(computeEsgMetrics([])).toEqual({
      studentsSupported: 0,
      countriesReached: 0,
      schoolsSupported: 0,
      totalCommittedCents: 0,
      fullScholarships: 0,
      namedScholarships: 0,
    });
  });
});

describe('toCsv', () => {
  it('emits a header and one line per row with EUR amounts', () => {
    const csv = toCsv([row({ amountCents: 123_456 })]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      'Campaign,Student,Country,School,Amount (EUR),Tier,Scholarship,Date',
    );
    expect(lines[1]).toContain('Help Amara study');
    expect(lines[1]).toContain('1234.56');
    expect(lines[1]).toContain('2026-06-01');
  });

  it('escapes commas and quotes', () => {
    const csv = toCsv([row({ campaignTitle: 'Amara, "the founder"' })]);
    expect(csv).toContain('"Amara, ""the founder"""');
  });

  it('renders an empty scholarship cell when none is set', () => {
    const csv = toCsv([row({ scholarshipName: null })]);
    const cells = csv.trim().split('\n')[1].split(',');
    expect(cells[6]).toBe(''); // scholarship column empty
  });
});
