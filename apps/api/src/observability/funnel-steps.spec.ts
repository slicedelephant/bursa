import {
  ANALYTICS_EVENT_TYPES,
  DONATION_FUNNEL,
  ESSENTIAL_EVENT_TYPES,
  isAnalyticsEventType,
  ONBOARDING_EVENT,
  ONBOARDING_FUNNEL,
} from './funnel-steps';

describe('funnel-steps', () => {
  it('orders the donation funnel from view to success', () => {
    expect(DONATION_FUNNEL.map((s) => s.key)).toEqual([
      'gallery_view',
      'campaign_view',
      'donate_start',
      'donate_success',
    ]);
  });

  it('exposes onboarding steps and the onboarding event name', () => {
    expect(ONBOARDING_EVENT).toBe('onboarding_step');
    expect(ONBOARDING_FUNNEL.map((s) => s.key)).toContain('submitted');
  });

  it('whitelist contains every donation key plus onboarding + share', () => {
    expect(ANALYTICS_EVENT_TYPES).toEqual(
      expect.arrayContaining([
        'gallery_view',
        'campaign_view',
        'donate_start',
        'donate_success',
        'onboarding_step',
        'share_click',
      ]),
    );
  });

  it('marks donate_success as essential', () => {
    expect(ESSENTIAL_EVENT_TYPES).toContain('donate_success');
  });

  it('validates event types', () => {
    expect(isAnalyticsEventType('campaign_view')).toBe(true);
    expect(isAnalyticsEventType('nope')).toBe(false);
    expect(isAnalyticsEventType(42)).toBe(false);
  });
});
