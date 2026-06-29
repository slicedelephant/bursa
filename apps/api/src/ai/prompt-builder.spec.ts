import {
  LENGTH_TARGETS,
  buildSharePrompt,
  buildStoryPrompt,
  buildTitlePrompt,
} from './prompt-builder';

describe('prompt-builder', () => {
  describe('buildTitlePrompt', () => {
    it('includes the input facts and a variant instruction (en)', () => {
      const p = buildTitlePrompt(
        {
          country: 'Nigeria',
          school: 'ESMT Berlin',
          program: 'Full-Time MBA',
          motivation: 'bring fintech back to West Africa',
          locale: 'en',
        },
        3,
      );
      expect(p.user).toContain('Nigeria');
      expect(p.user).toContain('ESMT Berlin');
      expect(p.user).toContain('Full-Time MBA');
      expect(p.user).toContain('bring fintech back to West Africa');
      expect(p.user).toContain('exactly 3 variants');
      expect(p.system).toContain('Respond in English');
    });

    it('uses the German brand rules and umlaut instruction (de)', () => {
      const p = buildTitlePrompt({
        country: 'Pakistan',
        school: 'INSEAD',
        program: 'MBA',
        motivation: 'Bildung',
        locale: 'de',
      });
      expect(p.system).toContain('ECHTEN Umlauten');
      expect(p.system).toContain('Ich-Form');
      expect(p.user).toContain('Varianten');
    });
  });

  describe('buildStoryPrompt', () => {
    it('asks for 3 paragraphs with the goal and motivation', () => {
      const p = buildStoryPrompt({
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'scale a payments team',
        locale: 'en',
      });
      expect(p.user).toContain('3 short paragraphs');
      expect(p.user).toContain('42000');
      expect(p.user).toContain('scale a payments team');
    });

    it('weaves in existing background notes when provided', () => {
      const p = buildStoryPrompt({
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'm',
        background: 'I led a 200k-user product',
        locale: 'en',
      });
      expect(p.user).toContain('I led a 200k-user product');
    });

    it('omits the background clause when absent', () => {
      const p = buildStoryPrompt({
        school: 'ESMT Berlin',
        goalEur: 42000,
        motivation: 'm',
        locale: 'en',
      });
      expect(p.user).not.toContain('Existing notes');
    });
  });

  describe('buildSharePrompt', () => {
    it('tailors guidance per channel (whatsapp is short)', () => {
      const p = buildSharePrompt({
        channel: 'whatsapp',
        title: 'T',
        story: 'S',
        locale: 'en',
      });
      expect(p.user).toContain('WhatsApp');
      expect(p.user).toContain('very short');
    });

    it('asks email for a subject line', () => {
      const p = buildSharePrompt({
        channel: 'email',
        title: 'T',
        story: 'S',
        locale: 'en',
      });
      expect(p.user).toContain('subject line');
    });

    it('asks linkedin for a hook and CTA', () => {
      const p = buildSharePrompt({
        channel: 'linkedin',
        title: 'T',
        story: 'S',
        locale: 'en',
      });
      expect(p.user).toContain('hook');
      expect(p.user).toContain('call to action');
    });

    it('uses German channel guidance for de locale', () => {
      const p = buildSharePrompt({
        channel: 'whatsapp',
        title: 'T',
        story: 'S',
        locale: 'de',
      });
      expect(p.user).toContain('sehr kurz');
    });
  });

  it('exposes length targets used by the ranking helper', () => {
    expect(LENGTH_TARGETS.title.max).toBeGreaterThan(LENGTH_TARGETS.title.min);
    expect(LENGTH_TARGETS.share.whatsapp.max).toBeLessThan(
      LENGTH_TARGETS.share.email.max,
    );
  });
});
