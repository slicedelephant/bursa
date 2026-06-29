/**
 * Pure tone / anti-slop / umlaut post-processor for coach output. No I/O, no
 * mutation, no imports.
 *
 * Guarantees the hard Bursa brand rules regardless of which provider produced
 * the text: strip AI-slop phrases and intensifiers, normalize em-/en-dashes to
 * hyphens, and for German locale enforce REAL umlauts (ä/ö/ü/ß) over a
 * conservative word list (never a blind ae→ä that would break "Aerosol").
 */

export type Locale = 'de' | 'en';

/** AI-slop phrases removed wholesale (case-insensitive), de + en. */
export const SLOP_PHRASES: readonly string[] = [
  'in der heutigen schnelllebigen welt',
  'in einer welt, die sich ständig verändert',
  'spannend, wie',
  'es ist wichtig zu beachten, dass',
  "in today's fast-paced world",
  'in a world that is constantly changing',
  "it's worth noting that",
  'it is important to note that',
  'at the end of the day',
  'when it comes to',
];

/** Intensifiers softened to nothing (whole-word, case-insensitive). */
export const SLOP_INTENSIFIERS: readonly string[] = [
  'enorm',
  'enormer',
  'fundamental',
  'massiv',
  'bahnbrechend',
  'revolutionär',
  'incredibly',
  'massively',
  'fundamentally',
  'groundbreaking',
  'game-changing',
];

/**
 * Conservative ASCII→umlaut word fixes for German. Only whole words a model
 * might emit without umlauts; never a blind substring replace.
 */
export const GERMAN_UMLAUT_WORDS: ReadonlyArray<readonly [string, string]> = [
  ['fuer', 'für'],
  ['ueber', 'über'],
  ['moechte', 'möchte'],
  ['moechten', 'möchten'],
  ['koennen', 'können'],
  ['koennte', 'könnte'],
  ['muessen', 'müssen'],
  ['waehrend', 'während'],
  ['naechste', 'nächste'],
  ['unterstuetzen', 'unterstützen'],
  ['unterstuetzung', 'Unterstützung'],
  ['traeume', 'Träume'],
  ['traum', 'Traum'],
  ['zukunft', 'Zukunft'],
  ['groesser', 'größer'],
  ['gross', 'groß'],
  ['strasse', 'Straße'],
  ['loesung', 'Lösung'],
  ['moeglich', 'möglich'],
  ['moeglichkeit', 'Möglichkeit'],
  ['hoehere', 'höhere'],
  ['schluessel', 'Schlüssel'],
  ['buergschaft', 'Bürgschaft'],
];

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Collapse stray whitespace a removal left behind WITHOUT destroying paragraph
 * breaks (a blank line between paragraphs is preserved as "\n\n").
 */
function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?([,.;:!?]) ?/g, '$1 ')
    .replace(/[ \t]+(\n)/g, '$1') // trailing spaces before a newline
    .replace(/\n{3,}/g, '\n\n') // cap blank runs at one blank line
    .replace(/[ \t]+$/gm, '')
    .trim();
}

/** Remove AI-slop phrases and intensifiers. */
export function stripAiSlop(text: string): string {
  let out = text;
  for (const phrase of SLOP_PHRASES) {
    out = out.replace(new RegExp(escapeRegExp(phrase), 'gi'), '');
  }
  for (const word of SLOP_INTENSIFIERS) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'), '');
  }
  return tidyWhitespace(out);
}

/** Normalize em-dashes / en-dashes (and dash-with-spaces) to a hyphen. */
export function normalizeDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ' - ').replace(/ {2,}/g, ' ');
}

/** Apply the conservative German umlaut word list, preserving capitalization. */
export function enforceGermanUmlauts(text: string): string {
  let out = text;
  for (const [ascii, real] of GERMAN_UMLAUT_WORDS) {
    const lower = new RegExp(`\\b${escapeRegExp(ascii)}\\b`, 'g');
    out = out.replace(lower, real);
    const capAscii = ascii.charAt(0).toUpperCase() + ascii.slice(1);
    const capReal = real.charAt(0).toUpperCase() + real.slice(1);
    out = out.replace(
      new RegExp(`\\b${escapeRegExp(capAscii)}\\b`, 'g'),
      capReal,
    );
  }
  return out;
}

/**
 * Full tone pass: dashes → strip slop → (de only) umlauts. Returns cleaned text.
 */
export function applyTone(text: string, locale: Locale): string {
  const dashed = normalizeDashes(text);
  const stripped = stripAiSlop(dashed);
  return locale === 'de' ? enforceGermanUmlauts(stripped) : stripped;
}
