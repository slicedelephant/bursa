import {
  budgetExhausted,
  channelLabel,
  formatRemainingBudget,
  kindLabel,
  recommendedVariant,
  variantPreview,
} from './ai-coach.helpers';

describe('ai-coach.helpers', () => {
  describe('channelLabel', () => {
    it('labels each channel', () => {
      expect(channelLabel('whatsapp')).toBe('WhatsApp');
      expect(channelLabel('email')).toBe('Email');
      expect(channelLabel('linkedin')).toBe('LinkedIn');
    });

    it('falls back to the raw value for an unknown channel', () => {
      expect(channelLabel('sms' as never)).toBe('sms');
    });
  });

  describe('kindLabel', () => {
    it('labels each kind', () => {
      expect(kindLabel('TITLE')).toBe('Title');
      expect(kindLabel('STORY')).toBe('Story draft');
      expect(kindLabel('SHARE')).toBe('Share text');
    });

    it('falls back to the raw value for an unknown kind', () => {
      expect(kindLabel('OTHER' as never)).toBe('OTHER');
    });
  });

  describe('formatRemainingBudget', () => {
    it('formats with thousands separators', () => {
      expect(formatRemainingBudget(18800, 20000)).toBe('18,800 of 20,000 tokens left');
    });

    it('clamps negatives to zero', () => {
      expect(formatRemainingBudget(-5, 1000)).toBe('0 of 1,000 tokens left');
    });
  });

  describe('budgetExhausted', () => {
    it('is true at or below zero', () => {
      expect(budgetExhausted(0)).toBe(true);
      expect(budgetExhausted(-10)).toBe(true);
    });

    it('is false with budget left', () => {
      expect(budgetExhausted(50)).toBe(false);
    });
  });

  describe('variantPreview', () => {
    it('collapses whitespace and keeps short text', () => {
      expect(variantPreview('  hello   world\n\nagain ')).toBe('hello world again');
    });

    it('truncates long text with an ellipsis', () => {
      const out = variantPreview('x'.repeat(200), 50);
      expect(out.length).toBe(50);
      expect(out.endsWith('…')).toBe(true);
    });

    it('handles empty / nullish input', () => {
      expect(variantPreview('')).toBe('');
      expect(variantPreview(undefined as unknown as string)).toBe('');
    });
  });

  describe('recommendedVariant', () => {
    it('returns the recommended variant when present', () => {
      const variants = [
        { text: 'a', length: 1, recommended: false },
        { text: 'b', length: 1, recommended: true },
      ];
      expect(recommendedVariant(variants)?.text).toBe('b');
    });

    it('falls back to the first variant when none is recommended', () => {
      const variants = [
        { text: 'a', length: 1, recommended: false },
        { text: 'b', length: 1, recommended: false },
      ];
      expect(recommendedVariant(variants)?.text).toBe('a');
    });

    it('returns null for an empty list', () => {
      expect(recommendedVariant([])).toBeNull();
      expect(recommendedVariant(undefined as never)).toBeNull();
    });
  });
});
