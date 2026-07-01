/**
 * E20 — pure local-bank-detail formatter/validator. Virtual IBANs are DISPLAY-ONLY:
 * we validate structure (length, alphanumerics, ISO-2 country prefix) and a mod-97
 * checksum (the ISO-13616 IBAN check), and format them into readable groups. There is
 * NO real bank/account verification here. No I/O, no mutation; returns new values.
 */

import { type CurrencyCode } from './currency';

const MIN_IBAN_LEN = 15;
const MAX_IBAN_LEN = 34;

/** Normalize an IBAN-ish string: strip spaces, uppercase. */
function normalize(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Move the first 4 chars to the end and map letters to numbers (A=10 … Z=35). */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) =>
    String(ch.charCodeAt(0) - 55),
  );
  // Process in chunks to avoid BigInt while staying precise.
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = String(remainder) + numeric.substring(i, i + 7);
    remainder = Number(block) % 97;
  }
  return remainder;
}

/**
 * Validate a virtual IBAN by structure + mod-97 checksum. Returns true only for a
 * well-formed, checksum-valid value. Display-only — no bank lookup.
 */
export function validateVirtualIban(value: string): boolean {
  const iban = normalize(value);
  if (iban.length < MIN_IBAN_LEN || iban.length > MAX_IBAN_LEN) {
    return false;
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return false;
  }
  return mod97(iban) === 1;
}

/** Group an IBAN into blocks of 4 for display: `KE29 1234 5678 …`. */
export function formatVirtualIban(value: string): string {
  return normalize(value)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export interface LocalBankDetailInput {
  readonly country: string;
  readonly currency: CurrencyCode;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly virtualIban?: string | null;
}

export interface LocalBankDetailView {
  readonly country: string;
  readonly currency: CurrencyCode;
  readonly bankName: string;
  readonly accountNumber: string;
  readonly virtualIban: string | null;
  readonly valid: boolean;
}

/**
 * Build the display view of a local bank detail. `valid` is true when there is no
 * virtual IBAN, or when the provided one passes structural + checksum validation.
 */
export function formatLocalBankDetail(
  input: LocalBankDetailInput,
): LocalBankDetailView {
  const hasIban = !!input.virtualIban && input.virtualIban.trim().length > 0;
  const valid = hasIban
    ? validateVirtualIban(input.virtualIban as string)
    : true;
  return {
    country: input.country.toUpperCase(),
    currency: input.currency,
    bankName: input.bankName.trim(),
    accountNumber: input.accountNumber.trim(),
    virtualIban: hasIban
      ? formatVirtualIban(input.virtualIban as string)
      : null,
    valid,
  };
}
