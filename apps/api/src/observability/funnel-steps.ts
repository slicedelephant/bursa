/**
 * Canonical funnel + product-event definitions. Single source of truth shared by
 * the ingest DTO whitelist, the aggregators and the seed. Pure data, no I/O.
 */

export interface FunnelStepDef {
  readonly key: string;
  readonly label: string;
}

/** Donation funnel: visitor -> campaign -> checkout start -> success. */
export const DONATION_FUNNEL: readonly FunnelStepDef[] = [
  { key: 'gallery_view', label: 'Gallery view' },
  { key: 'campaign_view', label: 'Campaign view' },
  { key: 'donate_start', label: 'Donation started' },
  { key: 'donate_success', label: 'Donation completed' },
];

/** Onboarding funnel: tracked via `onboarding_step` events with a `step`. */
export const ONBOARDING_FUNNEL: readonly FunnelStepDef[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'story', label: 'Story' },
  { key: 'video', label: 'Video / review' },
  { key: 'review', label: 'Review' },
  { key: 'submitted', label: 'Submitted' },
];

export const ONBOARDING_EVENT = 'onboarding_step';

/** Every accepted event `type` for the ingest endpoint (boundary whitelist). */
export const ANALYTICS_EVENT_TYPES: readonly string[] = [
  ...DONATION_FUNNEL.map((s) => s.key),
  ONBOARDING_EVENT,
  'share_click',
];

/** Events that are essential business signals (allowed even without analytics consent). */
export const ESSENTIAL_EVENT_TYPES: readonly string[] = ['donate_success'];

export function isAnalyticsEventType(value: unknown): value is string {
  return typeof value === 'string' && ANALYTICS_EVENT_TYPES.includes(value);
}
