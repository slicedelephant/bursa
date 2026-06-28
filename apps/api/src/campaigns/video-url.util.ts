// Pure parser for embeddable pitch-video links (YouTube / Vimeo).
// No I/O, no Nest — boundary-validated at the DTO and reused for display.
// We only accept URLs we can turn into a privacy-friendly embed; everything
// else is rejected so we never render an untrusted iframe source.

export type VideoProvider = 'youtube' | 'vimeo';

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
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

/** First non-empty path segment, or null. */
function firstSegment(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] ?? null;
}

function segmentAfter(pathname: string, marker: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  const idx = parts.indexOf(marker);
  return idx >= 0 ? (parts[idx + 1] ?? null) : null;
}

function parseYouTube(u: URL, host: string): ParsedVideo | null {
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = firstSegment(u.pathname);
  } else if (u.pathname === '/watch' || u.pathname === '/watch/') {
    id = u.searchParams.get('v');
  } else {
    id =
      segmentAfter(u.pathname, 'embed') ??
      segmentAfter(u.pathname, 'shorts') ??
      segmentAfter(u.pathname, 'v');
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return {
    provider: 'youtube',
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}

function parseVimeo(u: URL): ParsedVideo | null {
  const id = segmentAfter(u.pathname, 'video') ?? firstSegment(u.pathname);
  if (!id || !VIMEO_ID.test(id)) return null;
  return {
    provider: 'vimeo',
    id,
    embedUrl: `https://player.vimeo.com/video/${id}`,
  };
}

/** Parse a YouTube/Vimeo URL into a normalized embed, or null if unsupported. */
export function parseVideoUrl(url: string): ParsedVideo | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const host = bareHost(u.hostname);
  if (YOUTUBE_HOSTS.has(host)) return parseYouTube(u, host);
  if (VIMEO_HOSTS.has(host)) return parseVimeo(u);
  return null;
}

/** True when the URL can be embedded (used by the boundary validator). */
export function isEmbeddableVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}
