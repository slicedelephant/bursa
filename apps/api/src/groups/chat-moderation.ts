/**
 * E18 Groups — pure group-chat moderation. REUSES the E9 trust-and-safety text
 * heuristics (`normalizeText` + `matchSuspiciousKeywords`) plus a small illustrative
 * slur/profanity blocklist, exactly like the E17 student-voice moderation — one
 * moderation heuristic in the repo, no second filter. The chat is a moderated
 * request/response (no live socket): this decides APPROVE/REJECT with reasons and
 * validates the message length. Deterministic, no I/O, no mutation.
 */

import {
  matchSuspiciousKeywords,
  normalizeText,
} from '../trust-safety/ofac-keyword-matcher';

/** Max length of a group chat message. */
export const MAX_MESSAGE_LENGTH = 500;

/** Illustrative slur/profanity blocklist (lower-case), mirroring the E9/E17 style. */
export const CHAT_SLUR_BLOCKLIST: readonly string[] = [
  'idiot',
  'scammer',
  'fraud',
  'stupid',
  'hate',
];

export type ChatDecision = 'APPROVE' | 'REJECT';

export interface ChatModeration {
  readonly decision: ChatDecision;
  readonly reasons: string[];
}

function matchSlurs(text: string): string[] {
  const haystack = normalizeText(text);
  if (!haystack) return [];
  return CHAT_SLUR_BLOCKLIST.filter((term) =>
    haystack.includes(normalizeText(term)),
  );
}

export function moderateMessage(input: { text: string }): ChatModeration {
  const reasons: string[] = [];
  const trimmed = (input.text ?? '').trim();

  if (trimmed.length === 0) {
    reasons.push('empty_text');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    reasons.push('text_too_long');
  }
  for (const slur of matchSlurs(trimmed)) {
    reasons.push(`slur:${slur}`);
  }
  const suspicious = matchSuspiciousKeywords(trimmed);
  for (const kw of suspicious.matched) {
    reasons.push(`suspicious_keyword:${kw}`);
  }

  return {
    decision: reasons.length === 0 ? 'APPROVE' : 'REJECT',
    reasons,
  };
}
