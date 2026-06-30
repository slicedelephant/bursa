import { FeedChannel } from '../../core/models';

/** Pure presentation helpers for the channel-preferences panel. No I/O; returns
 * new values, never mutates inputs. */

export interface ChannelMeta {
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  /** IN_APP is always on and cannot be toggled off. */
  readonly locked: boolean;
  /** Whether this channel needs a delivery handle (phone / chat id). */
  readonly needsHandle: boolean;
}

const META: Record<FeedChannel, ChannelMeta> = {
  IN_APP: {
    label: 'In-app feed',
    icon: '📱',
    description: 'Your primary impact feed — always on.',
    locked: true,
    needsHandle: false,
  },
  EMAIL: {
    label: 'Email digest',
    icon: '✉️',
    description: 'A periodic summary of new updates.',
    locked: false,
    needsHandle: false,
  },
  PUSH: {
    label: 'Push',
    icon: '🔔',
    description: 'Browser/mobile push notifications.',
    locked: false,
    needsHandle: true,
  },
  WHATSAPP: {
    label: 'WhatsApp',
    icon: '🟢',
    description: 'Updates straight to WhatsApp.',
    locked: false,
    needsHandle: true,
  },
  TELEGRAM: {
    label: 'Telegram',
    icon: '🔵',
    description: 'Updates straight to Telegram.',
    locked: false,
    needsHandle: true,
  },
  MESSENGER: {
    label: 'Messenger',
    icon: '💬',
    description: 'Updates straight to Facebook Messenger.',
    locked: false,
    needsHandle: true,
  },
};

export function channelMeta(channel: FeedChannel): ChannelMeta {
  return META[channel];
}

/** Status text for a single channel preference row. */
export function channelStatusText(channel: FeedChannel, optIn: boolean): string {
  if (channel === 'IN_APP') return 'Always on';
  return optIn ? 'On' : 'Off';
}
