import { buildSimplePdf, escapePdfText } from './pdf.util';

describe('escapePdfText', () => {
  it('escapes parentheses and backslashes', () => {
    expect(escapePdfText('a(b)c\\d')).toBe('a\\(b\\)c\\\\d');
  });
  it('folds the euro sign and other non-ASCII to ASCII', () => {
    expect(escapePdfText('€100 — café')).toBe('EUR 100 ? caf?');
  });
});

describe('buildSimplePdf', () => {
  const pdf = buildSimplePdf('Bursa ESG Report', ['Students: 3', 'Total: EUR 42000']);

  it('produces a valid PDF 1.4 header and EOF', () => {
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('embeds the title and the report lines', () => {
    expect(pdf).toContain('(Bursa ESG Report) Tj');
    expect(pdf).toContain('(Students: 3) Tj');
    expect(pdf).toContain('(Total: EUR 42000) Tj');
  });

  it('writes a cross-reference table whose startxref points at "xref"', () => {
    expect(pdf).toContain('\nxref\n');
    const marker = 'startxref\n';
    const startxref = pdf.lastIndexOf(marker) + marker.length;
    const offset = parseInt(pdf.slice(startxref), 10);
    expect(pdf.slice(offset, offset + 4)).toBe('xref');
  });

  it('declares one more xref entry than there are objects (free entry 0)', () => {
    // 5 objects + the free object 0 => "0 6"
    expect(pdf).toContain('xref\n0 6\n');
  });
});
