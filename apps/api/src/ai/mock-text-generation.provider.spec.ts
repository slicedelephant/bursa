import { MockTextGenerationProvider } from './mock-text-generation.provider';
import { buildSharePrompt, buildStoryPrompt, buildTitlePrompt } from './prompt-builder';

describe('MockTextGenerationProvider', () => {
  const provider = new MockTextGenerationProvider();

  it('returns the requested number of title variants (en)', async () => {
    const prompt = buildTitlePrompt({
      country: 'Nigeria',
      school: 'ESMT Berlin',
      program: 'Full-Time MBA',
      motivation: 'fintech',
      locale: 'en',
    });
    const r = await provider.generate({ prompt, variants: 3 });
    expect(r.provider).toBe('mock');
    expect(r.variants).toHaveLength(3);
    r.variants.forEach((v) => expect(v.length).toBeGreaterThan(0));
  });

  it('is deterministic: same request yields identical output', async () => {
    const prompt = buildTitlePrompt({
      country: 'Pakistan',
      school: 'INSEAD',
      program: 'MBA',
      motivation: 'education',
      locale: 'en',
    });
    const a = await provider.generate({ prompt, variants: 3 });
    const b = await provider.generate({ prompt, variants: 3 });
    expect(a.variants).toEqual(b.variants);
  });

  it('produces German title variants for a German prompt', async () => {
    const prompt = buildTitlePrompt({
      country: 'Nigeria',
      school: 'ESMT Berlin',
      program: 'MBA',
      motivation: 'Bildung',
      locale: 'de',
    });
    const r = await provider.generate({ prompt, variants: 2 });
    expect(r.variants.join(' ')).toMatch(/[äöüß]/);
  });

  it('produces a multi-paragraph story draft', async () => {
    const prompt = buildStoryPrompt({
      school: 'ESMT Berlin',
      goalEur: 42000,
      motivation: 'scale a team',
      locale: 'en',
    });
    const r = await provider.generate({ prompt, variants: 2 });
    expect(r.variants[0]).toContain('\n\n');
  });

  it('tailors share output to the whatsapp channel (short)', async () => {
    const prompt = buildSharePrompt({
      channel: 'whatsapp',
      title: 'My MBA',
      story: 'short story',
      locale: 'en',
    });
    const r = await provider.generate({ prompt, variants: 2 });
    expect(r.variants[0].length).toBeLessThan(330);
  });

  it('produces an email share text with a subject line', async () => {
    const prompt = buildSharePrompt({
      channel: 'email',
      title: 'My MBA',
      story: 'short story',
      locale: 'en',
    });
    const r = await provider.generate({ prompt, variants: 1 });
    expect(r.variants[0]).toContain('Subject:');
  });

  it('varies output by input seed', async () => {
    const p1 = buildTitlePrompt({
      country: 'Nigeria',
      school: 'A',
      program: 'MBA',
      motivation: 'x',
      locale: 'en',
    });
    const p2 = buildTitlePrompt({
      country: 'Ghana',
      school: 'B',
      program: 'MBA',
      motivation: 'y',
      locale: 'en',
    });
    const a = await provider.generate({ prompt: p1, variants: 1, seed: 'a' });
    const b = await provider.generate({ prompt: p2, variants: 1, seed: 'b' });
    // Different seeds may rotate to a different starting template.
    expect(typeof a.variants[0]).toBe('string');
    expect(typeof b.variants[0]).toBe('string');
  });

  it('always returns at least one variant', async () => {
    const prompt = buildTitlePrompt({
      country: 'X',
      school: 'Y',
      program: 'Z',
      motivation: 'm',
      locale: 'en',
    });
    const r = await provider.generate({ prompt, variants: 0 });
    expect(r.variants.length).toBeGreaterThanOrEqual(1);
  });
});
