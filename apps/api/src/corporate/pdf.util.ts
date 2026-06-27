/**
 * Minimal, dependency-free single-page PDF writer — pure, no I/O. Emits a valid
 * PDF 1.4 document (Helvetica text lines) with a correct cross-reference table
 * whose byte offsets are computed from the running byte length. Used for the
 * sponsor ESG report export so we add NO new infrastructure/library. ASCII only
 * (non-ASCII is downgraded), so string length == byte length and the xref stays
 * correct. Returns a new string; never mutates inputs.
 */

/** Escape + ASCII-fold a string for use inside a PDF text literal `( … )`. */
export function escapePdfText(text: string): string {
  return text
    .replace(/€/g, 'EUR ')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function pad10(n: number): string {
  return n.toString().padStart(10, '0');
}

export function buildSimplePdf(title: string, lines: readonly string[]): string {
  const allLines = [title, '', ...lines];

  // Build the content stream (text object). First line is the heading.
  const content: string[] = ['BT', '/F1 12 Tf', '50 800 Td', '16 TL'];
  allLines.forEach((line, i) => {
    const op = i === 0 ? '' : 'T* ';
    content.push(`${op}(${escapePdfText(line)}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  const count = objects.length + 1;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${pad10(off)} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf + xref;
}
