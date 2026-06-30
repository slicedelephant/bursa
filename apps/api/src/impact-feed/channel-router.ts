/**
 * E17 — pure channel-delivery router. Maps a donor's per-channel opt-in
 * preferences onto the list of channels an update should go to. The in-app feed
 * is ALWAYS a target (it is the primary surface); every other channel
 * (email digest, push, WhatsApp, Telegram, Messenger) is opt-in only — nothing
 * is ever pushed to a messenger without explicit consent. No I/O; returns new
 * arrays; never mutates inputs.
 */

export type FeedChannelValue =
  | 'IN_APP'
  | 'EMAIL'
  | 'PUSH'
  | 'WHATSAPP'
  | 'TELEGRAM'
  | 'MESSENGER';

/** The external channels that go through the MessagingProvider (not in-app/email). */
export const MESSENGER_CHANNELS: ReadonlyArray<FeedChannelValue> = [
  'WHATSAPP',
  'TELEGRAM',
  'MESSENGER',
  'PUSH',
];

export interface ChannelPref {
  readonly channel: FeedChannelValue;
  readonly optIn: boolean;
  readonly handle?: string | null;
}

/**
 * All channels an update should be delivered to. IN_APP is always included even
 * if absent/false in the prefs; the rest only when explicitly opted in.
 */
export function routeChannels(
  prefs: ReadonlyArray<ChannelPref>,
): FeedChannelValue[] {
  const optedIn = prefs
    .filter((p) => p.channel !== 'IN_APP' && p.optIn)
    .map((p) => p.channel);
  return ['IN_APP', ...new Set(optedIn)];
}

/**
 * Only the external messenger/push channels the donor opted into AND for which a
 * delivery handle exists — the ones the MessagingProvider can actually reach.
 */
export function messengerChannels(
  prefs: ReadonlyArray<ChannelPref>,
): Array<{ channel: FeedChannelValue; handle: string }> {
  return prefs
    .filter(
      (p) =>
        p.optIn &&
        MESSENGER_CHANNELS.includes(p.channel) &&
        typeof p.handle === 'string' &&
        p.handle.length > 0,
    )
    .map((p) => ({ channel: p.channel, handle: p.handle as string }));
}
