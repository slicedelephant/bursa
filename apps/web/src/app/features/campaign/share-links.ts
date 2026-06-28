// Pure one-tap share helpers: pre-written messages (EN/DE) + deeplink builders
// for WhatsApp / Telegram / Facebook. No DOM, no Angular — fully unit-tested.
// The component is just a thumb-friendly shell around these functions.

export type ShareChannel = 'whatsapp' | 'telegram' | 'facebook';
export type ShareLang = 'en' | 'de';

export interface ShareInput {
  url: string;
  studentName: string;
  title: string;
  lang?: ShareLang;
  /** Inner-circle framing: "be one of the first to back this campaign". */
  firstBackers?: boolean;
}

type Template = (studentName: string, title: string) => string;

const TEMPLATES: Record<ShareLang, { default: Template; firstBackers: Template }> = {
  en: {
    default: (name, title) =>
      `Support ${name}'s tuition campaign on Bursa: "${title}". Every euro goes directly to the school.`,
    firstBackers: (name, title) =>
      `Be one of the first to back ${name}'s tuition campaign on Bursa: "${title}". Your gift gets the momentum going.`,
  },
  de: {
    default: (name, title) =>
      `Unterstütze ${name}s Studiengebühren-Kampagne auf Bursa: „${title}". Jeder Euro geht direkt an die Hochschule.`,
    firstBackers: (name, title) =>
      `Werde eine:r der ersten Unterstützer:innen von ${name}s Kampagne auf Bursa: „${title}". Dein Beitrag bringt sie ins Rollen.`,
  },
};

/** Pre-written caption (without the URL — channels append it themselves). */
export function shareMessage(input: ShareInput): string {
  const lang = input.lang ?? 'en';
  const set = TEMPLATES[lang];
  const template = input.firstBackers ? set.firstBackers : set.default;
  return template(input.studentName, input.title);
}

/** Deeplinks for each channel, ready to drop into an anchor `href`. */
export function buildShareLinks(input: ShareInput): Record<ShareChannel, string> {
  const caption = shareMessage(input);
  const url = input.url;
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${caption} ${url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(caption)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

/** Absolute campaign URL from a window origin and a campaign id. */
export function campaignUrl(origin: string, id: string): string {
  return `${origin.replace(/\/$/, '')}/campaigns/${id}`;
}

/** Resolve a usable origin from a Location-like, with an SSR-safe fallback. */
export function originOf(location: { origin?: string } | null | undefined): string {
  return location?.origin ?? 'https://bursa.app';
}
