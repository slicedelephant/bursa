/**
 * E17 — pure impact-feed builder. Projects the existing E4 student milestones
 * (`CampaignUpdate`), derived funding milestones and APPROVED student-voice
 * messages into a single, chronologically sorted list of story cards. The feed
 * is NOT a second update store — it is a read-time projection so it never drifts
 * from the source (the E16 derived-state line). No I/O; returns new arrays;
 * never mutates inputs. Sort is newest-first with a deterministic tie-break.
 */

export type FeedItemKind =
  | 'IMPACT_UPDATE'
  | 'MILESTONE'
  | 'GOAL_REACHED'
  | 'STUDENT_VOICE';

export interface FeedItem {
  readonly key: string;
  readonly kind: FeedItemKind;
  readonly campaignId: string;
  readonly title: string;
  readonly body: string;
  readonly ctaUrl: string;
  readonly photoUrl: string | null;
  readonly videoUrl?: string | null;
  readonly voiceUrl?: string | null;
  readonly createdAt: Date;
}

export interface UpdateSource {
  readonly type: 'update';
  readonly id: string;
  readonly campaignId: string;
  readonly title: string;
  readonly body: string;
  readonly photoUrl: string | null;
  readonly createdAt: Date | string;
}

export interface MilestoneSource {
  readonly type: 'milestone';
  readonly campaignId: string;
  readonly percent: number;
  readonly studentName: string;
  readonly photoUrl: string | null;
  readonly createdAt: Date | string;
}

export interface VoiceSource {
  readonly type: 'voice';
  readonly id: string;
  readonly campaignId: string;
  readonly studentName: string;
  readonly text: string;
  readonly videoUrl: string | null;
  readonly voiceUrl: string | null;
  readonly photoUrl: string | null;
  readonly createdAt: Date | string;
}

export type FeedSource = UpdateSource | MilestoneSource | VoiceSource;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function campaignCta(campaignId: string): string {
  return `/campaigns/${campaignId}`;
}

function fromUpdate(s: UpdateSource): FeedItem {
  return {
    key: `update:${s.id}`,
    kind: 'IMPACT_UPDATE',
    campaignId: s.campaignId,
    title: s.title,
    body: s.body,
    ctaUrl: campaignCta(s.campaignId),
    photoUrl: s.photoUrl,
    createdAt: toDate(s.createdAt),
  };
}

function fromMilestone(s: MilestoneSource): FeedItem {
  const reached = s.percent >= 100;
  return {
    key: `milestone:${s.campaignId}:${s.percent}`,
    kind: reached ? 'GOAL_REACHED' : 'MILESTONE',
    campaignId: s.campaignId,
    title: reached
      ? `${s.studentName} reached the goal!`
      : `${s.percent}% funded`,
    body: reached
      ? `${s.studentName} is fully funded — the tuition goes straight to the school.`
      : `${s.studentName}'s campaign just passed ${s.percent}% of its tuition goal.`,
    ctaUrl: campaignCta(s.campaignId),
    photoUrl: s.photoUrl,
    createdAt: toDate(s.createdAt),
  };
}

function fromVoice(s: VoiceSource): FeedItem {
  return {
    key: `voice:${s.id}`,
    kind: 'STUDENT_VOICE',
    campaignId: s.campaignId,
    title: `A thank-you from ${s.studentName}`,
    body: s.text,
    ctaUrl: campaignCta(s.campaignId),
    photoUrl: s.photoUrl,
    videoUrl: s.videoUrl,
    voiceUrl: s.voiceUrl,
    createdAt: toDate(s.createdAt),
  };
}

/** Stable read key for an item (used by FeedRead + the read streak). */
export function feedItemKey(item: FeedItem): string {
  return item.key;
}

/** Builds the chronologically sorted (newest first) feed from mixed sources. */
export function buildFeed(sources: ReadonlyArray<FeedSource>): FeedItem[] {
  const items = sources.map((s) => {
    switch (s.type) {
      case 'update':
        return fromUpdate(s);
      case 'milestone':
        return fromMilestone(s);
      case 'voice':
        return fromVoice(s);
    }
  });

  return items.sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() ||
      a.key.localeCompare(b.key),
  );
}
