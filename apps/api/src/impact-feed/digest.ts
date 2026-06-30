/**
 * E17 — pure digest aggregator. Condenses N feed items into a single
 * email/messenger digest: a capped list of top (newest) items, the total count,
 * a period label and a compact text body. No I/O; returns new objects; never
 * mutates inputs. Consumed by the channel router → messaging provider for the
 * opt-in email/messenger digest.
 */

import { FeedItem } from './feed-builder';

export interface DigestOptions {
  /** Max number of items to spell out in the digest body. */
  readonly maxItems?: number;
  /** Human label for the digest period, e.g. "this week". */
  readonly periodLabel?: string;
}

export interface Digest {
  readonly count: number;
  readonly periodLabel: string;
  readonly topItems: FeedItem[];
  readonly body: string;
}

export function buildDigest(
  items: ReadonlyArray<FeedItem>,
  options: DigestOptions = {},
): Digest {
  const maxItems = options.maxItems ?? 3;
  const periodLabel = options.periodLabel ?? 'recently';

  const sorted = [...items].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const topItems = sorted.slice(0, Math.max(0, maxItems));

  if (sorted.length === 0) {
    return {
      count: 0,
      periodLabel,
      topItems: [],
      body: `No new updates ${periodLabel}.`,
    };
  }

  const lines = topItems.map((i) => `• ${i.title}`);
  const more = sorted.length - topItems.length;
  const tail =
    more > 0 ? `\n…and ${more} more update${more === 1 ? '' : 's'}.` : '';
  const header = `${sorted.length} update${sorted.length === 1 ? '' : 's'} ${periodLabel}:`;

  return {
    count: sorted.length,
    periodLabel,
    topItems,
    body: `${header}\n${lines.join('\n')}${tail}`,
  };
}
