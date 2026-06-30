import {
  buildAnnotations,
  EsgReportView,
  SourceEntry,
  toReportCsv,
  toReportPdf,
  toReportPdfLines,
} from './audit-annotation';

const sources: SourceEntry[] = [
  {
    sequence: 7,
    entryType: 'PAYOUT',
    amountCents: 250_000,
    reason: 'tuition disbursement',
    entryHash: 'ab12cd',
  },
  {
    sequence: 3,
    entryType: 'DONATION',
    amountCents: 50_000,
    reason: 'gift, "anonymous"',
    entryHash: 'ef34gh',
  },
];

const view: EsgReportView = {
  standard: 'GRI_2024',
  period: { start: '2026-01-01', end: '2026-12-31' },
  metrics: [
    {
      code: 'GRI 201-1',
      label: 'Economic value distributed',
      value: 2500,
      unit: 'EUR',
      note: 'From 1 payout entry',
    },
  ],
  annotations: buildAnnotations(sources),
};

describe('audit-annotation', () => {
  describe('buildAnnotations', () => {
    it('numbers sources in order, preserving fields', () => {
      const a = buildAnnotations(sources);
      expect(a[0].ref).toBe(1);
      expect(a[0].sequence).toBe(7);
      expect(a[0].entryHash).toBe('ab12cd');
      expect(a[1].ref).toBe(2);
      expect(a[1].sequence).toBe(3);
    });

    it('does not mutate its input', () => {
      const snapshot = JSON.stringify(sources);
      buildAnnotations(sources);
      expect(JSON.stringify(sources)).toBe(snapshot);
    });
  });

  describe('toReportCsv', () => {
    it('includes a metrics block and an annotation block', () => {
      const csv = toReportCsv(view);
      expect(csv).toContain('Code,Metric,Value,Unit,Note');
      expect(csv).toContain('GRI 201-1');
      expect(csv).toContain('Ref,Sequence,Type,Amount (EUR),Reason,Entry hash');
      expect(csv).toContain('ab12cd');
      // EUR formatting for an annotation amount
      expect(csv).toContain('2500.00');
    });

    it('escapes commas and quotes in cells', () => {
      const csv = toReportCsv(view);
      // reason 'gift, "anonymous"' must be quoted + inner quotes doubled
      expect(csv).toContain('"gift, ""anonymous"""');
    });

    it('accepts Date instances for the period', () => {
      const csv = toReportCsv({
        ...view,
        period: { start: new Date('2026-01-01'), end: new Date('2026-12-31') },
      });
      expect(csv).toContain('2026-01-01 to 2026-12-31');
    });
  });

  describe('toReportPdfLines', () => {
    it('lists metrics and footnoted annotations', () => {
      const lines = toReportPdfLines(view);
      expect(lines.some((l) => l.includes('GRI 201-1'))).toBe(true);
      expect(lines.some((l) => l.startsWith('[1] seq=7'))).toBe(true);
      expect(lines.some((l) => l.includes('ab12cd'))).toBe(true);
    });
  });

  describe('toReportPdf', () => {
    it('produces a valid PDF document string', () => {
      const pdf = toReportPdf(view);
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(pdf).toContain('%%EOF');
    });
  });
});
