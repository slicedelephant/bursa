/**
 * E13 Employer-Matching — pure multi-language label resolver.
 *
 * The app shell stays English, but the match feature carries EN/DE/FR/ES copy for
 * the checkout offer, the claim, and the balance counter. This pure core builds
 * the localised strings. No I/O, no mutation; unknown locales fall back to EN.
 *
 * Employer names are interpolated verbatim (real accents/special characters), so
 * "Nestlé" or "Société Générale" render correctly.
 */

export type Locale = 'en' | 'de' | 'fr' | 'es';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'de', 'fr', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';

export interface OfferLabels {
  readonly headline: string;
  readonly cta: string;
  readonly balance: string;
}

export interface LabelInput {
  readonly employerName: string;
  readonly matchEur: number;
  readonly capEur: number;
  readonly remainingEur: number;
}

type Builder = (input: LabelInput) => OfferLabels;

const eur = (n: number): string => `€${Math.round(n)}`;

const BUILDERS: Record<Locale, Builder> = {
  en: (i) => ({
    headline: `${i.employerName} matches your gift with ${eur(i.matchEur)}`,
    cta: `Claim ${eur(i.matchEur)} employer match`,
    balance: `${eur(i.remainingEur)} match still available this year`,
  }),
  de: (i) => ({
    headline: `${i.employerName} verdoppelt deine Spende um ${eur(i.matchEur)}`,
    cta: `${eur(i.matchEur)} Arbeitgeber-Match sichern`,
    balance: `${eur(i.remainingEur)} Match dieses Jahr noch verfügbar`,
  }),
  fr: (i) => ({
    headline: `${i.employerName} abonde votre don de ${eur(i.matchEur)}`,
    cta: `Obtenir l'abondement de ${eur(i.matchEur)}`,
    balance: `${eur(i.remainingEur)} d'abondement encore disponible cette année`,
  }),
  es: (i) => ({
    headline: `${i.employerName} iguala tu donación con ${eur(i.matchEur)}`,
    cta: `Reclamar ${eur(i.matchEur)} de tu empresa`,
    balance: `${eur(i.remainingEur)} de igualación disponible este año`,
  }),
};

/** Normalise an arbitrary locale string to a supported Locale (default EN). */
export function resolveLocale(raw: string | null | undefined): Locale {
  const lower = (raw ?? '').toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(lower as Locale)
    ? (lower as Locale)
    : DEFAULT_LOCALE;
}

/** Build the localised offer/claim/balance labels for a locale. */
export function resolveLabels(
  locale: string | null | undefined,
  input: LabelInput,
): OfferLabels {
  return BUILDERS[resolveLocale(locale)](input);
}
