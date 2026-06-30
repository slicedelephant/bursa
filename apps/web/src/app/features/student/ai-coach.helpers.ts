// Pure presentation helpers for the AI coach panel. No Angular, no I/O.

import { AiShareChannel, AiVariant, CoachKind } from '../../core/models';

/** Human label for a share channel. */
export function channelLabel(channel: AiShareChannel): string {
  switch (channel) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'email':
      return 'Email';
    case 'linkedin':
      return 'LinkedIn';
    default:
      return channel;
  }
}

/** Human label for a coach generation kind. */
export function kindLabel(kind: CoachKind): string {
  switch (kind) {
    case 'TITLE':
      return 'Title';
    case 'STORY':
      return 'Story draft';
    case 'SHARE':
      return 'Share text';
    default:
      return kind;
  }
}

/** Compact "X of Y tokens left" string for the budget meter. */
export function formatRemainingBudget(remainingTokens: number, limitTokens: number): string {
  const remaining = Math.max(0, Math.floor(remainingTokens));
  const limit = Math.max(0, Math.floor(limitTokens));
  return `${remaining.toLocaleString('en-US')} of ${limit.toLocaleString('en-US')} tokens left`;
}

/** True once the budget cannot be used (drives the disabled state). */
export function budgetExhausted(remainingTokens: number): boolean {
  return Math.floor(remainingTokens) <= 0;
}

/** Single-line preview of a variant, truncated for list display. */
export function variantPreview(text: string, maxChars = 120): string {
  const oneLine = (text ?? '').replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxChars) {
    return oneLine;
  }
  return `${oneLine.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

/** Pick the recommended variant (or the first), null when there are none. */
export function recommendedVariant<T extends AiVariant>(variants: readonly T[]): T | null {
  if (!variants || variants.length === 0) {
    return null;
  }
  return variants.find((v) => v.recommended) ?? variants[0];
}
