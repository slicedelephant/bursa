/**
 * E20 — pure client-side label resolver for the localized donate flow. The backend
 * returns a `{ locale, labels }` map; this resolver reads a key from it with a safe
 * fallback so the UI always renders a string, even before labels load. Mirrors the
 * backend `fx/i18n-labels.ts` fallback behaviour. No I/O; returns new values.
 */

/** English fallbacks so the flow renders before/without a fetched label map. */
const EN_FALLBACK: Record<string, string> = {
  amount: 'Amount',
  pay_with: 'Pay with',
  to_school: 'Goes to the school',
  confirm: 'Confirm donation',
  you_pay: 'You pay',
  school_receives: 'School receives',
};

/** Resolve a label key from a fetched map, falling back to English, then the key itself. */
export function label(labels: Record<string, string> | null | undefined, key: string): string {
  const fromMap = labels?.[key];
  if (fromMap && fromMap.trim().length > 0) {
    return fromMap;
  }
  return EN_FALLBACK[key] ?? key;
}

/** True when a locale string is one of the sample donate locales. */
export function isSupportedLocale(locale: string): boolean {
  return ['en', 'sw', 'yo', 'bn', 'tl'].includes(locale);
}

/** Normalize an arbitrary locale input to a supported one (default `en`). */
export function normalizeLocale(locale: string | null | undefined): string {
  const value = (locale ?? '').toLowerCase();
  return isSupportedLocale(value) ? value : 'en';
}
