import { FeedSource, buildFeed, feedItemKey } from './feed-builder';

describe('buildFeed', () => {
  const update: FeedSource = {
    type: 'update',
    id: 'upd_1',
    campaignId: 'c_amara',
    title: 'Passed exams',
    body: 'Cleared every module.',
    photoUrl: 'https://x/amara.jpg',
    createdAt: '2026-06-20T09:00:00.000Z',
  };
  const milestone: FeedSource = {
    type: 'milestone',
    campaignId: 'c_amara',
    percent: 50,
    studentName: 'Amara',
    photoUrl: 'https://x/amara.jpg',
    createdAt: '2026-06-22T09:00:00.000Z',
  };
  const voice: FeedSource = {
    type: 'voice',
    id: 'msg_9',
    campaignId: 'c_amara',
    studentName: 'Amara',
    text: 'Thank you for believing in me.',
    videoUrl: 'https://x/thanks.mp4',
    voiceUrl: null,
    photoUrl: 'https://x/amara.jpg',
    createdAt: '2026-06-28T10:00:00.000Z',
  };

  it('builds a story card from a campaign update', () => {
    const [item] = buildFeed([update]);
    expect(item).toMatchObject({
      key: 'update:upd_1',
      kind: 'IMPACT_UPDATE',
      campaignId: 'c_amara',
      title: 'Passed exams',
      ctaUrl: '/campaigns/c_amara',
      photoUrl: 'https://x/amara.jpg',
    });
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it('builds a MILESTONE card below 100% and GOAL_REACHED at/above 100%', () => {
    const [m] = buildFeed([milestone]);
    expect(m.kind).toBe('MILESTONE');
    expect(m.title).toBe('50% funded');
    expect(m.key).toBe('milestone:c_amara:50');

    const [g] = buildFeed([
      { ...(milestone as any), percent: 100 } as FeedSource,
    ]);
    expect(g.kind).toBe('GOAL_REACHED');
    expect(g.title).toContain('reached the goal');
  });

  it('builds a STUDENT_VOICE card carrying the media URLs', () => {
    const [v] = buildFeed([voice]);
    expect(v).toMatchObject({
      key: 'voice:msg_9',
      kind: 'STUDENT_VOICE',
      title: 'A thank-you from Amara',
      body: 'Thank you for believing in me.',
      videoUrl: 'https://x/thanks.mp4',
      voiceUrl: null,
    });
  });

  it('sorts newest first across mixed sources', () => {
    const feed = buildFeed([update, voice, milestone]);
    expect(feed.map((i) => i.key)).toEqual([
      'voice:msg_9', // 06-28
      'milestone:c_amara:50', // 06-22
      'update:upd_1', // 06-20
    ]);
  });

  it('breaks ties deterministically by key', () => {
    const a: FeedSource = { ...(update as any), id: 'b' };
    const b: FeedSource = { ...(update as any), id: 'a' };
    const feed = buildFeed([a, b]);
    expect(feed.map((i) => i.key)).toEqual(['update:a', 'update:b']);
  });

  it('does not mutate the input', () => {
    const input = [update, milestone];
    const copy = [...input];
    buildFeed(input);
    expect(input).toEqual(copy);
  });

  it('feedItemKey returns the item key', () => {
    const [item] = buildFeed([update]);
    expect(feedItemKey(item)).toBe('update:upd_1');
  });
});
