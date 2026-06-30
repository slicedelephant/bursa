import { MatchLocale } from '../../core/models';

/**
 * Pure employer-name + multi-language helpers for the match UI. The app shell is
 * English; these pick the locale we ask the API for and render employer names
 * (with real accents) safely. No I/O; returns new strings.
 */

const SUPPORTED: readonly MatchLocale[] = ['en', 'de', 'fr', 'es'];
const DEFAULT_LOCALE: MatchLocale = 'en';

/** Normalise a browser/UI locale string to a supported MatchLocale (default EN). */
export function resolveLocale(raw: string | null | undefined): MatchLocale {
  const lower = (raw ?? '').toLowerCase().slice(0, 2);
  return SUPPORTED.includes(lower as MatchLocale) ? (lower as MatchLocale) : DEFAULT_LOCALE;
}

const LANGUAGE_NAMES: Record<MatchLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

/** Human language name for a locale (for a language switcher). */
export function languageName(locale: MatchLocale): string {
  return LANGUAGE_NAMES[locale];
}

/** The list of locales the match UI can switch between. */
export function supportedLocales(): readonly MatchLocale[] {
  return SUPPORTED;
}

/** Render an employer name safely; falls back to a neutral label when empty. */
export function employerLabel(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : 'your employer';
}

/** "Your employer SAP" style prefix, locale-aware verb. */
export function employerPrefix(locale: MatchLocale, name: string | null | undefined): string {
  const employer = employerLabel(name);
  switch (locale) {
    case 'de':
      return `Dein Arbeitgeber ${employer}`;
    case 'fr':
      return `Votre employeur ${employer}`;
    case 'es':
      return `Tu empresa ${employer}`;
    default:
      return `Your employer ${employer}`;
  }
}
