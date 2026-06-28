import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import {
  ConsentState,
  mayTrack,
  needsConsentDecision,
  readConsent,
  writeConsent,
} from './analytics-consent';
import { AnalyticsEvent } from './funnel-events';
import { getOrCreateVisitorId } from './visitor-id';

/**
 * Privacy-aware product analytics. Reads consent + an anonymous visitor id from
 * localStorage. `track()` is consent-gated (essential events always pass) and
 * fire-and-forget: a failed beacon never disturbs the user flow. No IP, no PII is
 * ever sent — only the anonymous visitorId and the event shape.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = inject(ApiService);

  readonly consent = signal<ConsentState>(readConsent(localStorage));
  private readonly visitorId = getOrCreateVisitorId(localStorage);

  track(event: AnalyticsEvent): void {
    if (!mayTrack(event.type, this.consent())) return;
    this.api
      .trackEvent({ ...event, visitorId: this.visitorId })
      .subscribe({ error: () => undefined });
  }

  needsDecision(): boolean {
    return needsConsentDecision(this.consent());
  }

  grantConsent(): void {
    this.consent.set(writeConsent(localStorage, true));
  }

  denyConsent(): void {
    this.consent.set(writeConsent(localStorage, false));
  }
}
