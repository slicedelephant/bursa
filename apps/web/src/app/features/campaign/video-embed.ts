// Pure parser turning a YouTube/Vimeo link into a safe iframe `src`.
// Mirrors the backend boundary validator so only embeddable links are rendered.
// No Angular, no DOM — trivially unit-tested.

export type VideoProvider = 'youtube' | 'vimeo';

export interface VideoEmbed {
  provider: VideoProvider;
  embedUrl: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'player.vimeo.com']);

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

function after(parts: string[], marker: string): string | null {
  const idx = parts.indexOf(marker);
  return idx >= 0 ? (parts[idx + 1] ?? null) : null;
}

function youtubeId(u: URL, host: string): string | null {
  const parts = segments(u.pathname);
  if (host === 'youtu.be') return parts[0] ?? null;
  if (u.pathname === '/watch' || u.pathname === '/watch/') {
    return u.searchParams.get('v');
  }
  return after(parts, 'embed') ?? after(parts, 'shorts') ?? after(parts, 'v');
}

/** Parse a YouTube/Vimeo URL into an embeddable iframe source, or null. */
export function toEmbed(url: string | null | undefined): VideoEmbed | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const host = bareHost(u.hostname);
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(u, host);
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (VIMEO_HOSTS.has(host)) {
    const id = after(segments(u.pathname), 'video') ?? segments(u.pathname)[0] ?? null;
    if (!id || !VIMEO_ID.test(id)) return null;
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}
