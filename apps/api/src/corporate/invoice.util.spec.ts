import {
  VAT_RATE,
  buildInvoiceNo,
  computeInvoiceAmounts,
  documentTypeFor,
} from './invoice.util';

describe('documentTypeFor', () => {
  it('is SPONSORING when a logo is recognised (counter-performance => VAT)', () => {
    expect(documentTypeFor(true)).toBe('SPONSORING');
  });
  it('is DONATION for a pure gift', () => {
    expect(documentTypeFor(false)).toBe('DONATION');
  });
});

describe('computeInvoiceAmounts', () => {
  it('adds 19% VAT on top of the net for SPONSORING', () => {
    const a = computeInvoiceAmounts(100_000, 'SPONSORING');
    expect(a.netCents).toBe(100_000);
    expect(a.vatCents).toBe(Math.round(100_000 * VAT_RATE));
    expect(a.grossCents).toBe(100_000 + a.vatCents);
  });
  it('charges no VAT for a DONATION (Zuwendungsbestätigung)', () => {
    const a = computeInvoiceAmounts(100_000, 'DONATION');
    expect(a).toEqual({ netCents: 100_000, vatCents: 0, grossCents: 100_000 });
  });
  it('rounds VAT to whole cents', () => {
    const a = computeInvoiceAmounts(333, 'SPONSORING');
    expect(a.vatCents).toBe(63); // round(333 * 0.19) = 63
    expect(a.grossCents).toBe(396);
  });
});

describe('buildInvoiceNo', () => {
  it('builds a stable, upper-cased invoice number with the year', () => {
    expect(buildInvoiceNo(2026, 'abcd1234efgh')).toBe('BURSA-INV-2026-1234EFGH');
  });
  it('pads short seeds', () => {
    expect(buildInvoiceNo(2026, 'a1')).toBe('BURSA-INV-2026-A1');
  });
});
