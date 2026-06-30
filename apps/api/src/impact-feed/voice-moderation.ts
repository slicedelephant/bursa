/**
 * E17 — pure student-voice moderation. Reuses the E9 trust-and-safety text
 * heuristics (`normalizeText` + `matchSuspiciousKeywords`) and adds a small
 * illustrative slur/profanity blocklist, so there is exactly one moderation
 * heuristic in the repo (no second filter). Also validates the text length and
 * the optional video/voice URLs (URLs only — there is no upload pipeline). It is
 * deterministic, pure (no I/O, no mutation) and returns an APPROVE/REJECT
 * decision with reasons.
 */

import {
  matchSuspiciousKeywords,
  normalizeText,
} from '../trust-safety/ofac-keyword-matcher';

/** Max length of a thank-you message body. */
export const MAX_VOICE_TEXT_LENGTH = 600;

/** Illustrative slur/profanity blocklist (lower-case), mirroring the E9 style. */
export const SLUR_BLOCKLIST: readonly string[] = [
  'idiot',
  'scammer',
  'fraud',
  'stupid',
  'hate',
];

export interface VoiceInput {
  readonly text: string;
  readonly videoUrl?: string | null;
  readonly voiceUrl?: string | null;
}

export type VoiceDecision = 'APPROVE' | 'REJECT';

export interface VoiceModeration {
  readonly decision: VoiceDecision;
  readonly reasons: string[];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function matchSlurs(text: string): string[] {
  const haystack = normalizeText(text);
  if (!haystack) return [];
  return SLUR_BLOCKLIST.filter((term) =>
    haystack.includes(normalizeText(term)),
  );
}

export function moderateVoice(input: VoiceInput): VoiceModeration {
  const reasons: string[] = [];

  const trimmed = (input.text ?? '').trim();
  if (trimmed.length === 0) {
    reasons.push('empty_text');
  }
  if (trimmed.length > MAX_VOICE_TEXT_LENGTH) {
    reasons.push('text_too_long');
  }

  for (const slur of matchSlurs(trimmed)) {
    reasons.push(`slur:${slur}`);
  }

  const suspicious = matchSuspiciousKeywords(trimmed);
  for (const kw of suspicious.matched) {
    reasons.push(`suspicious_keyword:${kw}`);
  }

  if (
    input.videoUrl !== undefined &&
    input.videoUrl !== null &&
    input.videoUrl.length > 0 &&
    !isHttpUrl(input.videoUrl)
  ) {
    reasons.push('url_invalid:videoUrl');
  }
  if (
    input.voiceUrl !== undefined &&
    input.voiceUrl !== null &&
    input.voiceUrl.length > 0 &&
    !isHttpUrl(input.voiceUrl)
  ) {
    reasons.push('url_invalid:voiceUrl');
  }

  return {
    decision: reasons.length === 0 ? 'APPROVE' : 'REJECT',
    reasons,
  };
}
