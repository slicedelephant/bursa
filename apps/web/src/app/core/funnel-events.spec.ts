import {
  campaignViewEvent,
  donateStartEvent,
  donateSuccessEvent,
  galleryViewEvent,
  onboardingStepEvent,
  ONBOARDING_STEPS,
  shareClickEvent,
} from './funnel-events';

describe('funnel-events', () => {
  it('builds a gallery view event', () => {
    expect(galleryViewEvent('/campaigns')).toEqual({
      type: 'gallery_view',
      path: '/campaigns',
    });
  });

  it('builds campaign view / donate start / donate success with the campaign id', () => {
    expect(campaignViewEvent('c1')).toEqual({
      type: 'campaign_view',
      campaignId: 'c1',
      path: '/campaigns/c1',
    });
    expect(donateStartEvent('c1').type).toBe('donate_start');
    expect(donateSuccessEvent('c1')).toEqual({
      type: 'donate_success',
      campaignId: 'c1',
    });
  });

  it('builds onboarding step events for every known step', () => {
    for (const step of ONBOARDING_STEPS) {
      const e = onboardingStepEvent(step);
      expect(e.type).toBe('onboarding_step');
      expect(e.step).toBe(step);
    }
  });

  it('captures the share channel in metadata', () => {
    expect(shareClickEvent('c1', 'whatsapp').metadata).toEqual({
      channel: 'whatsapp',
    });
  });
});
