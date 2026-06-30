import {
  buildTaxReport,
  maskIban,
  regimeForCountry,
  TaxPayoutInput,
  TaxSchoolInput,
  taxReportToCsv,
} from './tax-report';

const payouts: TaxPayoutInput[] = [
  {
    payoutId: 'p1',
    campaignTitle: 'Amara Okonkwo',
    amountCents: 40000,
    currency: 'EUR',
    sentAt: new Date('2026-06-20T10:00:00.000Z'),
  },
  {
    payoutId: 'p2',
    campaignTitle: 'Kwame "K" Mensah',
    amountCents: 25000,
    currency: 'EUR',
    sentAt: '2026-06-21T10:00:00.000Z',
  },
];

const euSchool: TaxSchoolInput = {
  schoolId: 'school-1',
  name: 'ESMT Berlin',
  country: 'DE',
  iban: 'DE89370400440532013000',
  taxId: 'DE811234567',
};

const usSchool: TaxSchoolInput = {
  schoolId: 'school-2',
  name: 'Wharton',
  country: 'US',
  iban: null,
  taxId: '12-3456789',
};

describe('tax-report', () => {
  describe('regimeForCountry', () => {
    it('maps EU countries to SEPA', () => {
      expect(regimeForCountry('DE')).toBe('EU_SEPA');
      expect(regimeForCountry(' fr ')).toBe('EU_SEPA');
    });
    it('maps non-EU to US 1099', () => {
      expect(regimeForCountry('US')).toBe('US_1099');
      expect(regimeForCountry('NG')).toBe('US_1099');
    });
  });

  describe('maskIban', () => {
    it('masks all but the last 4', () => {
      expect(maskIban('DE89370400440532013000')).toBe('**** 3000');
    });
    it('handles missing / short IBANs', () => {
      expect(maskIban(null)).toBe('N/A');
      expect(maskIban('12')).toBe('****');
    });
  });

  describe('buildTaxReport', () => {
    it('builds a SEPA report for an EU school with masked IBAN', () => {
      const report = buildTaxReport(euSchool, payouts);
      expect(report.regime).toBe('EU_SEPA');
      expect(report.recipientAccount).toBe('**** 3000');
      expect(report.totalCents).toBe(65000);
      expect(report.lines[0].classification).toContain('SEPA');
    });

    it('builds a 1099 report for a US school', () => {
      const report = buildTaxReport(usSchool, payouts);
      expect(report.regime).toBe('US_1099');
      expect(report.recipientAccount).toBe('N/A');
      expect(report.lines[0].classification).toContain('1099');
      expect(report.recipientTaxId).toBe('12-3456789');
    });

    it('defaults a missing taxId to N/A', () => {
      const report = buildTaxReport({ ...usSchool, taxId: null }, payouts);
      expect(report.recipientTaxId).toBe('N/A');
    });
  });

  describe('taxReportToCsv', () => {
    it('renders header block + escaped line rows', () => {
      const csv = taxReportToCsv(buildTaxReport(euSchool, payouts));
      expect(csv).toContain('Regime,EU_SEPA');
      expect(csv).toContain('Payout,Date,Description,Amount,Classification');
      expect(csv).toContain('400.00');
      // The campaign title with a comma/quote is CSV-escaped.
      expect(csv).toContain('"Tuition disbursement — Kwame ""K"" Mensah"');
    });
  });
});
