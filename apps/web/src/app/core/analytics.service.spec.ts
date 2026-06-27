import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import { ApiService, TrackEventBody } from './api.service';
import { campaignViewEvent, donateSuccessEvent } from './funnel-events';

describe('AnalyticsService', () => {
  let trackEvent: jest.Mock;

  function setup() {
    trackEvent = jest.fn().mockReturnValue(of({ recorded: true }));
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { trackEvent } }],
    });
    return TestBed.inject(AnalyticsService);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('needs a consent decision by default and skips behavioural events', () => {
    const service = setup();
    expect(service.needsDecision()).toBe(true);
    service.track(campaignViewEvent('c1'));
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('always sends essential events even without consent', () => {
    const service = setup();
    service.track(donateSuccessEvent('c1'));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    const body = trackEvent.mock.calls[0][0] as TrackEventBody;
    expect(body.type).toBe('donate_success');
    expect(body.visitorId).toBeDefined();
  });

  it('sends behavioural events once consent is granted', () => {
    const service = setup();
    service.grantConsent();
    expect(service.consent()).toBe('granted');
    service.track(campaignViewEvent('c1'));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect((trackEvent.mock.calls[0][0] as TrackEventBody).campaignId).toBe('c1');
  });

  it('stops sending behavioural events after consent is denied', () => {
    const service = setup();
    service.grantConsent();
    service.denyConsent();
    expect(service.consent()).toBe('denied');
    service.track(campaignViewEvent('c1'));
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('swallows beacon errors (fire-and-forget)', () => {
    const service = setup();
    trackEvent.mockReturnValueOnce({
      subscribe: ({ error }: { error: () => void }) => error(),
    });
    service.grantConsent();
    expect(() => service.track(campaignViewEvent('c1'))).not.toThrow();
  });
});
