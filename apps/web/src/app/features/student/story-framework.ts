// Guided story framework: prompts (not a blank textarea) plus a pure composer.
// Before/after structure — background, the funding gap, and the vision — that the
// wizard turns into the canonical campaign story. No Angular, fully unit-tested.

export type StoryKey = 'background' | 'challenge' | 'vision';

export interface StoryPrompt {
  key: StoryKey;
  label: string;
  hint: string;
  placeholder: string;
}

export interface StoryParts {
  background?: string;
  challenge?: string;
  vision?: string;
}

/** Must match `CreateCampaignDto.story` `@MinLength(20)` on the backend. */
export const STORY_MIN_LENGTH = 20;

export const STORY_PROMPTS: StoryPrompt[] = [
  {
    key: 'background',
    label: 'Where you are coming from',
    hint: 'Your background and what you have built so far.',
    placeholder:
      'I built and scaled a mobile payments team in Lagos serving 200,000 users…',
  },
  {
    key: 'challenge',
    label: 'The funding gap',
    hint: 'What stands between you and the classroom right now.',
    placeholder:
      'I was admitted, but currency devaluation pushed tuition far beyond my savings…',
  },
  {
    key: 'vision',
    label: 'Where this takes you',
    hint: 'The impact once your tuition is funded.',
    placeholder:
      'With this MBA I will bring operational experience back to West Africa and mentor founders…',
  },
];

/** Join the filled-in parts into trimmed paragraphs (canonical display story). */
export function composeStory(parts: StoryParts): string {
  return [parts.background, parts.challenge, parts.vision]
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0)
    .join('\n\n');
}

/** True once the composed story is long enough to pass boundary validation. */
export function isStoryReady(parts: StoryParts): boolean {
  return composeStory(parts).length >= STORY_MIN_LENGTH;
}
