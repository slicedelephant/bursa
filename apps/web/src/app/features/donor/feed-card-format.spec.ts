import { FeedItem } from '../../core/models';
import { feedCtaLabel, feedKindStyle, feedRelativeTime, hasMedia } from './feed-card-format';

function item(partial: Partial<FeedItem>): FeedItem {
  return {
    key: 'k',
    kind: 'IMPACT_UPDATE',
    campaignId: 'c',
    title: 't',
    body: 'b',
    ctaUrl: '/campaigns/c',
    photoUrl: null,
    createdAt: '2026-06-20T00:00:00.000Z',
    read: false,
    ...partial,
  };
}

describe('feedKindStyle', () => {
  it('maps each known kind to a distinct label', () => {
    expect(feedKindStyle('STUDENT_VOICE').label).toBe('From your student');
    expect(feedKindStyle('GOAL_REACHED').label).toBe('Goal reached');
    expect(feedKindStyle('MILESTONE').label).toBe('Milestone');
    expect(feedKindStyle('IMPACT_UPDATE').label).toBe('Update');
  });

  it('falls back for an unknown kind', () => {
    expect(feedKindStyle('SOMETHING' as never).label).toBe('Update');
  });
});

describe('feedCtaLabel', () => {
  it('uses a voice-specific CTA for student voices', () => {
    expect(feedCtaLabel(item({ kind: 'STUDENT_VOICE' }))).toBe('See their campaign');
  });

  it('uses the default CTA otherwise', () => {
    expect(feedCtaLabel(item({ kind: 'MILESTONE' }))).toBe('View campaign');
  });
});

describe('hasMedia', () => {
  it('is true when a video or voice URL is present', () => {
    expect(hasMedia(item({ videoUrl: 'https://x/v.mp4' }))).toBe(true);
    expect(hasMedia(item({ voiceUrl: 'https://x/v.ogg' }))).toBe(true);
  });

  it('is false without media', () => {
    expect(hasMedia(item({}))).toBe(false);
  });
});

describe('feedRelativeTime', () => {
  const now = new Date('2026-06-20T12:00:00.000Z');

  it('reports minutes, hours, days and months', () => {
    expect(feedRelativeTime('2026-06-20T11:30:00.000Z', now)).toBe('30m ago');
    expect(feedRelativeTime('2026-06-20T09:00:00.000Z', now)).toBe('3h ago');
    expect(feedRelativeTime('2026-06-15T12:00:00.000Z', now)).toBe('5d ago');
    expect(feedRelativeTime('2026-04-01T12:00:00.000Z', now)).toBe('2mo ago');
  });

  it('reports "just now" for very recent or future/invalid times', () => {
    expect(feedRelativeTime('2026-06-20T11:59:40.000Z', now)).toBe('just now');
    expect(feedRelativeTime('2026-06-21T00:00:00.000Z', now)).toBe('just now');
    expect(feedRelativeTime('not-a-date', now)).toBe('just now');
  });
});
