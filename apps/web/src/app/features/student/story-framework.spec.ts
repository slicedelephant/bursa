import { STORY_MIN_LENGTH, STORY_PROMPTS, composeStory, isStoryReady } from './story-framework';

describe('STORY_PROMPTS', () => {
  it('guides the student with three before/after prompts', () => {
    expect(STORY_PROMPTS.map((p) => p.key)).toEqual(['background', 'challenge', 'vision']);
  });

  it('each prompt carries a label, hint and placeholder', () => {
    for (const p of STORY_PROMPTS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.hint.length).toBeGreaterThan(0);
      expect(p.placeholder.length).toBeGreaterThan(0);
    }
  });
});

describe('composeStory', () => {
  it('joins the non-empty parts into paragraphs', () => {
    const story = composeStory({
      background: 'I come from Lagos.',
      challenge: 'The naira devalued.',
      vision: 'I will mentor founders.',
    });
    expect(story).toBe('I come from Lagos.\n\nThe naira devalued.\n\nI will mentor founders.');
  });

  it('skips empty/whitespace parts and trims each', () => {
    expect(composeStory({ background: '  Hello  ', challenge: '   ', vision: 'World' })).toBe(
      'Hello\n\nWorld',
    );
  });

  it('returns an empty string when nothing is filled in', () => {
    expect(composeStory({})).toBe('');
  });
});

describe('isStoryReady', () => {
  it('is false when the composed story is shorter than the minimum', () => {
    expect(isStoryReady({ background: 'short' })).toBe(false);
  });

  it('is true once the composed story meets the minimum length', () => {
    expect(
      isStoryReady({
        background: 'I built a payments team serving many users.',
      }),
    ).toBe(true);
  });

  it('exposes the minimum length used by the backend boundary', () => {
    expect(STORY_MIN_LENGTH).toBe(20);
  });
});
