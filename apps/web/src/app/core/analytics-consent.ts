// Consent gate for product analytics (GDPR/ePrivacy). Pure over a minimal storage
// interface. Default = analytics OFF until the visitor opts in; essential business
// signals (e.g. a completed donation) are always allowed because they are not used
// for behavioural profiling.

import { KeyValueStorage } from './visitor-id';

export type ConsentState = 'unset' | 'granted' | 'denied';

export const CONSENT_KEY = 'bursa_analytics_consent';

/** Events that may be sent regardless of consent (business outcome, not tracking). */
export const ESSENTIAL_EVENTS: readonly string[] = ['donate_success'];

export function readConsent(storage: KeyValueStorage): ConsentState {
  const raw = storage.getItem(CONSENT_KEY);
  return raw === 'granted' || raw === 'denied' ? raw : 'unset';
}

export function writeConsent(storage: KeyValueStorage, granted: boolean): ConsentState {
  const next: ConsentState = granted ? 'granted' : 'denied';
  storage.setItem(CONSENT_KEY, next);
  return next;
}

/** Whether the banner still needs to be shown. */
export function needsConsentDecision(state: ConsentState): boolean {
  return state === 'unset';
}

/** Decides whether an event of `type` may be sent under the current consent. */
export function mayTrack(type: string, state: ConsentState): boolean {
  if (ESSENTIAL_EVENTS.includes(type)) return true;
  return state === 'granted';
}
