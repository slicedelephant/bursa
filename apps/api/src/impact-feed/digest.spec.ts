import { buildDigest } from './digest';
import { FeedItem } from './feed-builder';

function item(key: string, title: string, iso: string): FeedItem {
  return {
    key,
    kind: 'IMPACT_UPDATE',
    campaignId: 'c',
    title,
    body: 'b',
    ctaUrl: '/campaigns/c',
    photoUrl: null,
    createdAt: new Date(iso),
  };
}

describe('buildDigest', () => {
  it('reports an empty digest with no items', () => {
    const d = buildDigest([], { periodLabel: 'this week' });
    expect(d.count).toBe(0);
    expect(d.topItems).toEqual([]);
    expect(d.body).toBe('No new updates this week.');
  });

  it('lists the newest items up to the cap', () => {
    const items = [
      item('a', 'Oldest', '2026-06-01T00:00:00.000Z'),
      item('b', 'Middle', '2026-06-10T00:00:00.000Z'),
      item('c', 'Newest', '2026-06-20T00:00:00.000Z'),
    ];
    const d = buildDigest(items, { maxItems: 2, periodLabel: 'this week' });
    expect(d.count).toBe(3);
    expect(d.topItems.map((i) => i.title)).toEqual(['Newest', 'Middle']);
    expect(d.body).toContain('3 updates this week:');
    expect(d.body).toContain('• Newest');
    expect(d.body).toContain('• Middle');
    expect(d.body).toContain('…and 1 more update.');
  });

  it('pluralises the "more" tail when several items are hidden', () => {
    const items = [
      item('a', 'A', '2026-06-01T00:00:00.000Z'),
      item('b', 'B', '2026-06-02T00:00:00.000Z'),
      item('c', 'C', '2026-06-03T00:00:00.000Z'),
      item('d', 'D', '2026-06-04T00:00:00.000Z'),
    ];
    const d = buildDigest(items, { maxItems: 1 });
    expect(d.body).toContain('…and 3 more updates.');
  });

  it('uses a default period label and cap', () => {
    const d = buildDigest([item('a', 'One', '2026-06-01T00:00:00.000Z')]);
    expect(d.periodLabel).toBe('recently');
    expect(d.body).toContain('1 update recently:');
    expect(d.body).not.toContain('more update');
  });

  it('does not mutate the input array', () => {
    const items = [
      item('a', 'A', '2026-06-01T00:00:00.000Z'),
      item('b', 'B', '2026-06-02T00:00:00.000Z'),
    ];
    const copy = [...items];
    buildDigest(items);
    expect(items).toEqual(copy);
  });
});
