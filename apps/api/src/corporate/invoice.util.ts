import { InvoiceDocType } from '@prisma/client';

/**
 * Pure invoice maths — no I/O. Tax branch (payments-design §5): logo/recognition
 * turns a gift into sponsoring (a service) carrying 19% VAT; a pure gift gets a
 * Zuwendungsbestätigung with no VAT. The goal-bound tuition contribution is the
 * NET amount (stays 100% school-bound); VAT is an add-on the company pays on top.
 */
export const VAT_RATE = 0.19;

export interface InvoiceAmounts {
  readonly netCents: number;
  readonly vatCents: number;
  readonly grossCents: number;
}

export function documentTypeFor(logoRecognition: boolean): InvoiceDocType {
  return logoRecognition ? 'SPONSORING' : 'DONATION';
}

export function computeInvoiceAmounts(
  netCents: number,
  docType: InvoiceDocType,
): InvoiceAmounts {
  if (docType !== 'SPONSORING') {
    return { netCents, vatCents: 0, grossCents: netCents };
  }
  const vatCents = Math.round(netCents * VAT_RATE);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/** Stable invoice number, e.g. BURSA-INV-2026-1234EFGH (last 8 of a cuid). */
export function buildInvoiceNo(year: number, seedId: string): string {
  return `BURSA-INV-${year}-${seedId.slice(-8).toUpperCase()}`;
}
