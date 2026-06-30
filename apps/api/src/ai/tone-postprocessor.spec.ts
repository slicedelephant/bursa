import {
  applyTone,
  enforceGermanUmlauts,
  normalizeDashes,
  stripAiSlop,
} from './tone-postprocessor';

describe('tone-postprocessor', () => {
  describe('stripAiSlop', () => {
    it('removes AI-slop phrases (case-insensitive)', () => {
      const out = stripAiSlop("In today's fast-paced world, I need your help.");
      expect(out.toLowerCase()).not.toContain('fast-paced world');
      expect(out).toContain('I need your help.');
    });

    it('removes intensifiers as whole words only', () => {
      const out = stripAiSlop('This is a massiv enormer step forward.');
      expect(out).not.toMatch(/\bmassiv\b/i);
      expect(out).not.toMatch(/\benormer\b/i);
      expect(out).toContain('step forward.');
    });

    it('does not strip an intensifier embedded in a larger word', () => {
      // "fundamental" is an intensifier, but "fundamentals" is a real word.
      const out = stripAiSlop('Learning the fundamentals matters.');
      expect(out).toContain('fundamentals');
    });

    it('tidies the whitespace left behind', () => {
      const out = stripAiSlop('A massiv  big   gap.');
      expect(out).not.toContain('  ');
    });
  });

  describe('normalizeDashes', () => {
    it('replaces em-dashes with hyphens', () => {
      expect(normalizeDashes('Lagos—Berlin')).toBe('Lagos - Berlin');
    });

    it('replaces en-dashes with hyphens', () => {
      expect(normalizeDashes('2024–2026')).toBe('2024 - 2026');
    });

    it('leaves plain hyphens untouched', () => {
      expect(normalizeDashes('Full-Time MBA')).toBe('Full-Time MBA');
    });
  });

  describe('enforceGermanUmlauts', () => {
    it('fixes common ASCII-umlaut words', () => {
      const out = enforceGermanUmlauts(
        'Ich moechte fuer meine Zukunft lernen.',
      );
      expect(out).toContain('möchte');
      expect(out).toContain('für');
    });

    it('preserves capitalization at sentence start', () => {
      expect(enforceGermanUmlauts('Fuer mich zählt das.')).toContain('Für');
    });

    it('does not touch legitimate words that merely contain the letters', () => {
      // "neuerung" contains "ueru"? No standalone match; "feuer" contains "euer"
      // but not the whole word "ueber". Whole-word guard keeps these intact.
      const out = enforceGermanUmlauts('Das Feuer und die Neuerung bleiben.');
      expect(out).toContain('Feuer');
      expect(out).toContain('Neuerung');
    });
  });

  describe('applyTone', () => {
    it('for de: normalizes dashes, strips slop, enforces umlauts', () => {
      const out = applyTone(
        'Spannend, wie ich moechte fuer meine Traeume — massiv — kaempfen.',
        'de',
      );
      expect(out.toLowerCase()).not.toContain('spannend, wie');
      expect(out).not.toMatch(/\bmassiv\b/i);
      expect(out).not.toContain('—');
      expect(out).toContain('möchte');
      expect(out).toContain('für');
      expect(out).toContain('Träume');
    });

    it('for en: strips slop and dashes but leaves text ASCII', () => {
      const out = applyTone(
        "It's worth noting that this is a groundbreaking — moment.",
        'en',
      );
      expect(out.toLowerCase()).not.toContain('worth noting');
      expect(out).not.toMatch(/\bgroundbreaking\b/i);
      expect(out).not.toContain('—');
      // English path must not invent umlauts.
      expect(out).not.toContain('ä');
    });
  });
});
