/**
 * Pure prompt construction for the AI fundraising coach. No I/O, no mutation,
 * no imports. Produces the system + user prompts the provider sends to the LLM.
 *
 * Keeping prompts here (and unit-tested) means the brand rules (real umlauts for
 * German, no AI-slop, hyphens not em-dashes, Du-form) live in one auditable place
 * and the provider call stays thin.
 */

export type Locale = 'de' | 'en';
export type ShareChannel = 'whatsapp' | 'email' | 'linkedin';

export interface TitleInput {
  readonly country: string;
  readonly school: string;
  readonly program: string;
  readonly motivation: string;
  readonly locale: Locale;
}

export interface StoryInput {
  readonly school: string;
  readonly goalEur: number;
  readonly motivation: string;
  readonly background?: string;
  readonly locale: Locale;
}

export interface ShareInput {
  readonly channel: ShareChannel;
  readonly title: string;
  readonly story: string;
  readonly locale: Locale;
}

export interface BuiltPrompt {
  readonly system: string;
  readonly user: string;
}

/** Target character windows used by the ranking helper, per kind/channel. */
export const LENGTH_TARGETS = {
  title: { min: 20, max: 80 },
  story: { min: 200, max: 900 },
  share: {
    whatsapp: { min: 60, max: 320 },
    email: { min: 200, max: 800 },
    linkedin: { min: 150, max: 600 },
  },
} as const;

function brandRules(locale: Locale): string {
  const common =
    'Write as the student in first person. Be specific, warm and concrete, ' +
    'never generic. Do NOT use AI-slop phrases, hype or intensifiers ' +
    '(no "groundbreaking", "massively", "fundamentally"). Use hyphens, never ' +
    'em-dashes. No emojis unless the channel asks for one.';
  if (locale === 'de') {
    return (
      'Antworte auf Deutsch mit ECHTEN Umlauten (ä, ö, ü, ß) - niemals ae/oe/ue/ss. ' +
      'Sprich in der Ich-Form, den Leser in der Du-Form an (nie Sie). ' +
      common
    );
  }
  return 'Respond in English. ' + common;
}

/** Shared instruction to return N clean variants, one per line. */
function variantInstruction(n: number, locale: Locale): string {
  return locale === 'de'
    ? `Gib genau ${n} Varianten zurück, je eine pro Zeile, ohne Nummerierung, ohne Anführungszeichen.`
    : `Return exactly ${n} variants, one per line, with no numbering and no quotes.`;
}

export function buildTitlePrompt(input: TitleInput, variants = 3): BuiltPrompt {
  const t = LENGTH_TARGETS.title;
  const lead =
    input.locale === 'de'
      ? `Erzeuge kurze, emotionale Kampagnen-Titel (${t.min}-${t.max} Zeichen) für eine Studierende aus ${input.country}, zugelassen am ${input.school} (${input.program}).`
      : `Generate short, emotional campaign titles (${t.min}-${t.max} characters) for a student from ${input.country}, admitted to ${input.school} (${input.program}).`;
  const motiv =
    input.locale === 'de'
      ? `Kernmotivation: ${input.motivation}.`
      : `Core motivation: ${input.motivation}.`;
  return {
    system: brandRules(input.locale),
    user: `${lead} ${motiv} ${variantInstruction(variants, input.locale)}`,
  };
}

export function buildStoryPrompt(input: StoryInput, variants = 2): BuiltPrompt {
  const t = LENGTH_TARGETS.story;
  const lead =
    input.locale === 'de'
      ? `Schreibe einen Kampagnen-Story-Entwurf in 3 kurzen Absätzen (${t.min}-${t.max} Zeichen gesamt): (1) Herkunft und bisher Erreichtes, (2) die Finanzierungslücke, (3) die Vision nach dem Studium. Schule: ${input.school}. Finanzierungsziel: ${input.goalEur} EUR. Motivation: ${input.motivation}.`
      : `Write a campaign story draft in 3 short paragraphs (${t.min}-${t.max} characters total): (1) background and what has been built, (2) the funding gap, (3) the vision after the degree. School: ${input.school}. Funding goal: ${input.goalEur} EUR. Motivation: ${input.motivation}.`;
  const ctx = input.background
    ? input.locale === 'de'
      ? ` Bestehender Notiztext der Studierenden: ${input.background}.`
      : ` Existing notes from the student: ${input.background}.`
    : '';
  return {
    system: brandRules(input.locale),
    user: `${lead}${ctx} ${variantInstruction(variants, input.locale)}`,
  };
}

function channelGuidance(channel: ShareChannel, locale: Locale): string {
  const de = {
    whatsapp:
      'WhatsApp: sehr kurz, persönlich, ein Satz plus Link-Hinweis, höchstens ein Emoji.',
    email:
      'E-Mail: mit Betreffzeile (Prefix "Betreff:") und kurzem Body, etwas mehr Kontext, kein Emoji.',
    linkedin:
      'LinkedIn: professionell, starker erster Satz als Hook, klarer Call-to-Action, 1-2 Hashtags erlaubt.',
  } as const;
  const en = {
    whatsapp:
      'WhatsApp: very short, personal, one sentence plus a link cue, at most one emoji.',
    email:
      'Email: include a subject line (prefix "Subject:") and a short body, a bit more context, no emoji.',
    linkedin:
      'LinkedIn: professional, a strong first-sentence hook, a clear call to action, 1-2 hashtags allowed.',
  } as const;
  return (locale === 'de' ? de : en)[channel];
}

export function buildSharePrompt(input: ShareInput, variants = 3): BuiltPrompt {
  const lead =
    input.locale === 'de'
      ? `Schreibe Social-Share-Texte für die Kampagne "${input.title}". Kurzfassung der Story: ${input.story}.`
      : `Write social-share texts for the campaign "${input.title}". Story summary: ${input.story}.`;
  return {
    system: brandRules(input.locale),
    user: `${lead} ${channelGuidance(input.channel, input.locale)} ${variantInstruction(variants, input.locale)}`,
  };
}
