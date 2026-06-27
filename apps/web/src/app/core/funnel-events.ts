// Canonical client-side funnel/product events. Pure builders mirroring the API's
// `funnel-steps` whitelist. Keeping the two sides independently defined (small,
// each tested) avoids a shared package while staying in lock-step.

export type AnalyticsEventType =
  | 'gallery_view'
  | 'campaign_view'
  | 'donate_start'
  | 'donate_success'
  | 'onboarding_step'
  | 'share_click';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  campaignId?: string;
  path?: string;
  step?: string;
  metadata?: Record<string, unknown>;
}

export const ONBOARDING_STEPS = [
  'basics',
  'story',
  'video',
  'review',
  'submitted',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function galleryViewEvent(path?: string): AnalyticsEvent {
  return { type: 'gallery_view', path };
}

export function campaignViewEvent(campaignId: string): AnalyticsEvent {
  return { type: 'campaign_view', campaignId, path: `/campaigns/${campaignId}` };
}

export function donateStartEvent(campaignId: string): AnalyticsEvent {
  return { type: 'donate_start', campaignId };
}

export function donateSuccessEvent(campaignId: string): AnalyticsEvent {
  return { type: 'donate_success', campaignId };
}

export function onboardingStepEvent(step: OnboardingStep): AnalyticsEvent {
  return { type: 'onboarding_step', step };
}

export function shareClickEvent(
  campaignId: string,
  channel: string,
): AnalyticsEvent {
  return { type: 'share_click', campaignId, metadata: { channel } };
}
