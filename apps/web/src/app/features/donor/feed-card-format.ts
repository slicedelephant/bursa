import { FeedItem, FeedItemKind } from '../../core/models';

/** Pure presentation helpers for an impact-feed story card. No I/O; returns new
 * values, never mutates inputs. */

export interface FeedKindStyle {
  readonly icon: string;
  readonly accent: string;
  readonly label: string;
}

const KIND_STYLE: Record<FeedItemKind, FeedKindStyle> = {
  IMPACT_UPDATE: {
    icon: '📣',
    accent: 'bg-brand-blue/10 text-brand-blue',
    label: 'Update',
  },
  MILESTONE: {
    icon: '📈',
    accent: 'bg-brand-blue/10 text-brand-blue',
    label: 'Milestone',
  },
  GOAL_REACHED: {
    icon: '🎉',
    accent: 'bg-brand-green/10 text-brand-green',
    label: 'Goal reached',
  },
  STUDENT_VOICE: {
    icon: '💬',
    accent: 'bg-brand-green/10 text-brand-green',
    label: 'From your student',
  },
};

const FALLBACK: FeedKindStyle = {
  icon: '🔔',
  accent: 'bg-slate-100 text-slate2',
  label: 'Update',
};

export function feedKindStyle(kind: FeedItemKind): FeedKindStyle {
  return KIND_STYLE[kind] ?? FALLBACK;
}

/** CTA button label for a card, depending on its kind. */
export function feedCtaLabel(item: FeedItem): string {
  return item.kind === 'STUDENT_VOICE' ? 'See their campaign' : 'View campaign';
}

/** True when the card carries a media attachment worth surfacing. */
export function hasMedia(item: FeedItem): boolean {
  return Boolean(item.videoUrl) || Boolean(item.voiceUrl);
}

/** Short relative-time label for a card timestamp, given an injected "now". */
export function feedRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  if (Number.isNaN(then) || diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
