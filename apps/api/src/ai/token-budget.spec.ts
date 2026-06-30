import {
  CHARS_PER_TOKEN,
  DEFAULT_TOKEN_LIMIT,
  MIN_TOKENS_PER_GENERATION,
  applyUsage,
  estimateTokens,
  isExhausted,
  remaining,
  toBudgetView,
} from './token-budget';

describe('token-budget', () => {
  describe('estimateTokens', () => {
    it('estimates from combined input + output length', () => {
      const chars = 400; // 100 input + 300 output
      expect(estimateTokens(100, 300)).toBe(Math.ceil(chars / CHARS_PER_TOKEN));
    });

    it('never returns less than the per-generation floor', () => {
      expect(estimateTokens(1, 1)).toBe(MIN_TOKENS_PER_GENERATION);
      expect(estimateTokens(0, 0)).toBe(MIN_TOKENS_PER_GENERATION);
    });

    it('treats negative / non-finite input as zero chars', () => {
      expect(estimateTokens(-50, -50)).toBe(MIN_TOKENS_PER_GENERATION);
      expect(estimateTokens(NaN, Infinity)).toBe(MIN_TOKENS_PER_GENERATION);
    });
  });

  describe('remaining', () => {
    it('returns the difference', () => {
      expect(
        remaining({ limitTokens: 1000, usedTokens: 250, generations: 1 }),
      ).toBe(750);
    });

    it('clamps at zero (never negative)', () => {
      expect(
        remaining({ limitTokens: 1000, usedTokens: 1200, generations: 5 }),
      ).toBe(0);
    });
  });

  describe('isExhausted', () => {
    it('is false with plenty of budget', () => {
      expect(
        isExhausted({
          limitTokens: DEFAULT_TOKEN_LIMIT,
          usedTokens: 0,
          generations: 0,
        }),
      ).toBe(false);
    });

    it('is true once it cannot cover a minimal generation', () => {
      expect(
        isExhausted({ limitTokens: 100, usedTokens: 80, generations: 3 }),
      ).toBe(true);
    });

    it('is true exactly at the boundary', () => {
      expect(
        isExhausted({
          limitTokens: 100,
          usedTokens: 100 - MIN_TOKENS_PER_GENERATION + 1,
          generations: 1,
        }),
      ).toBe(true);
    });
  });

  describe('applyUsage', () => {
    it('returns a new state and never mutates the input', () => {
      const state = { limitTokens: 1000, usedTokens: 100, generations: 1 };
      const next = applyUsage(state, 200);
      expect(next).toEqual({
        limitTokens: 1000,
        usedTokens: 300,
        generations: 2,
      });
      expect(state.usedTokens).toBe(100);
      expect(state.generations).toBe(1);
    });

    it('caps usedTokens at the limit', () => {
      const next = applyUsage(
        { limitTokens: 500, usedTokens: 400, generations: 2 },
        9999,
      );
      expect(next.usedTokens).toBe(500);
      expect(next.generations).toBe(3);
    });

    it('treats negative / non-finite charges as zero', () => {
      const next = applyUsage(
        { limitTokens: 500, usedTokens: 100, generations: 0 },
        NaN,
      );
      expect(next.usedTokens).toBe(100);
      expect(next.generations).toBe(1);
    });
  });

  describe('toBudgetView', () => {
    it('builds the client-facing view', () => {
      const view = toBudgetView({
        limitTokens: 1000,
        usedTokens: 250,
        generations: 4,
      });
      expect(view).toEqual({
        limitTokens: 1000,
        usedTokens: 250,
        remainingTokens: 750,
        generations: 4,
        exhausted: false,
      });
    });

    it('reports exhausted when remaining is below the floor', () => {
      const view = toBudgetView({
        limitTokens: 100,
        usedTokens: 90,
        generations: 1,
      });
      expect(view.remainingTokens).toBe(10);
      expect(view.exhausted).toBe(true);
    });
  });
});
