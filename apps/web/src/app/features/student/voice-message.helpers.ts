/** Pure client-side helpers for the "send a thank-you message" surface (E17).
 * Pre-validates the text length and the optional media URLs before the request,
 * and turns the server's moderation reasons into a friendly hint. No I/O;
 * returns new values, never mutates inputs. The authoritative moderation still
 * happens on the server (reusing the E9 filter). */

export const MAX_VOICE_TEXT_LENGTH = 600;

export interface VoiceDraft {
  readonly text: string;
  readonly videoUrl?: string;
  readonly voiceUrl?: string;
}

export interface VoiceDraftValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateVoiceDraft(draft: VoiceDraft): VoiceDraftValidation {
  const errors: string[] = [];
  const text = (draft.text ?? '').trim();

  if (text.length === 0) errors.push('Please write a short message.');
  if (text.length > MAX_VOICE_TEXT_LENGTH) {
    errors.push(`Keep it under ${MAX_VOICE_TEXT_LENGTH} characters.`);
  }
  if (draft.videoUrl && draft.videoUrl.length > 0 && !isHttpUrl(draft.videoUrl)) {
    errors.push('The video link must be a valid http(s) URL.');
  }
  if (draft.voiceUrl && draft.voiceUrl.length > 0 && !isHttpUrl(draft.voiceUrl)) {
    errors.push('The voice link must be a valid http(s) URL.');
  }

  return { valid: errors.length === 0, errors };
}

/** Remaining characters for the live counter. */
export function charsRemaining(text: string): number {
  return MAX_VOICE_TEXT_LENGTH - (text ?? '').length;
}

/** A friendly hint from the server's moderation reasons. */
export function moderationHint(reasons: ReadonlyArray<string>): string {
  if (reasons.length === 0) return 'Your message was approved and sent.';
  if (reasons.some((r) => r.startsWith('slur:'))) {
    return 'Please remove any offensive language and try again.';
  }
  if (reasons.some((r) => r.startsWith('suspicious_keyword:'))) {
    return 'Your message looks like spam — please rephrase it.';
  }
  if (reasons.some((r) => r.startsWith('url_invalid:'))) {
    return 'One of your media links is not a valid URL.';
  }
  if (reasons.includes('text_too_long')) {
    return `Keep it under ${MAX_VOICE_TEXT_LENGTH} characters.`;
  }
  return 'Your message could not be approved. Please revise it.';
}
