/**
 * E20 — pure i18n label resolver for the localized donate flow. Reads a SAMPLE label
 * table for a few locales (en, sw, yo, bn, tl) and falls back deterministically to `en`
 * per missing locale/key. This is sample data, not a full app translation. No I/O, no
 * mutation; returns a fresh object.
 */

export type DonateLocale = 'en' | 'sw' | 'yo' | 'bn' | 'tl';

export type LabelKey =
  | 'amount'
  | 'pay_with'
  | 'to_school'
  | 'confirm'
  | 'you_pay'
  | 'school_receives';

const DEFAULT_LOCALE: DonateLocale = 'en';

const LABELS: Readonly<
  Record<DonateLocale, Partial<Record<LabelKey, string>>>
> = {
  en: {
    amount: 'Amount',
    pay_with: 'Pay with',
    to_school: 'Goes to the school',
    confirm: 'Confirm donation',
    you_pay: 'You pay',
    school_receives: 'School receives',
  },
  sw: {
    amount: 'Kiasi',
    pay_with: 'Lipa na',
    to_school: 'Huenda shuleni',
    confirm: 'Thibitisha mchango',
    you_pay: 'Unalipa',
    school_receives: 'Shule inapokea',
  },
  yo: {
    amount: 'Iye owó',
    pay_with: 'Sanwó pẹ̀lú',
    to_school: 'Ó lọ sí ilé-ìwé',
    confirm: 'Jẹ́rìí ẹ̀bùn',
  },
  bn: {
    amount: 'পরিমাণ',
    pay_with: 'দিয়ে পরিশোধ করুন',
    to_school: 'স্কুলে যায়',
    confirm: 'দান নিশ্চিত করুন',
  },
  tl: {
    amount: 'Halaga',
    pay_with: 'Magbayad gamit ang',
    to_school: 'Napupunta sa paaralan',
    confirm: 'Kumpirmahin ang donasyon',
  },
};

/** True when `locale` is a supported donate locale. */
export function isDonateLocale(locale: string): locale is DonateLocale {
  return Object.prototype.hasOwnProperty.call(LABELS, locale);
}

/** The label keys the donate flow uses. */
export function labelKeys(): LabelKey[] {
  return Object.keys(LABELS.en) as LabelKey[];
}

/**
 * Resolve labels for a locale. Each key falls back to `en` when the locale is unknown
 * or missing that key, so the flow always renders a string.
 */
export function resolveLabels(
  locale: string,
  keys: readonly LabelKey[] = labelKeys(),
): { locale: DonateLocale; labels: Record<string, string> } {
  const resolved: DonateLocale = isDonateLocale(locale)
    ? locale
    : DEFAULT_LOCALE;
  const table = LABELS[resolved];
  const fallback = LABELS[DEFAULT_LOCALE];

  const labels: Record<string, string> = {};
  for (const key of keys) {
    labels[key] = table[key] ?? fallback[key] ?? key;
  }
  return { locale: resolved, labels };
}
