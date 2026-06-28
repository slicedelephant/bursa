import {
  CONSENT_KEY,
  mayTrack,
  needsConsentDecision,
  readConsent,
  writeConsent,
} from './analytics-consent';
import { KeyValueStorage } from './visitor-id';

function memStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('analytics-consent', () => {
  it('defaults to unset and needs a decision', () => {
    const state = readConsent(memStorage());
    expect(state).toBe('unset');
    expect(needsConsentDecision(state)).toBe(true);
  });

  it('persists and reads granted/denied', () => {
    const storage = memStorage();
    expect(writeConsent(storage, true)).toBe('granted');
    expect(storage.data[CONSENT_KEY]).toBe('granted');
    expect(readConsent(storage)).toBe('granted');
    expect(writeConsent(storage, false)).toBe('denied');
    expect(readConsent(storage)).toBe('denied');
    expect(needsConsentDecision('denied')).toBe(false);
  });

  it('ignores corrupt stored values', () => {
    expect(readConsent(memStorage({ [CONSENT_KEY]: 'maybe' }))).toBe('unset');
  });

  it('always allows essential events', () => {
    expect(mayTrack('donate_success', 'denied')).toBe(true);
    expect(mayTrack('donate_success', 'unset')).toBe(true);
  });

  it('gates behavioural events on granted consent', () => {
    expect(mayTrack('campaign_view', 'granted')).toBe(true);
    expect(mayTrack('campaign_view', 'denied')).toBe(false);
    expect(mayTrack('campaign_view', 'unset')).toBe(false);
  });
});
