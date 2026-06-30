import { rankVariants, windowDistance } from './variant-ranking';

const WINDOW = { min: 20, max: 80 };

describe('variant-ranking', () => {
  describe('windowDistance', () => {
    it('is zero inside the window', () => {
      expect(windowDistance(50, WINDOW)).toBe(0);
      expect(windowDistance(20, WINDOW)).toBe(0);
      expect(windowDistance(80, WINDOW)).toBe(0);
    });

    it('measures chars below the minimum', () => {
      expect(windowDistance(10, WINDOW)).toBe(10);
    });

    it('measures chars above the maximum', () => {
      expect(windowDistance(100, WINDOW)).toBe(20);
    });
  });

  describe('rankVariants', () => {
    it('trims and drops empty variants', () => {
      const r = rankVariants(
        ['  A nicely sized campaign title here  ', '   ', ''],
        WINDOW,
      );
      expect(r.variants).toHaveLength(1);
      expect(r.variants[0].text).toBe('A nicely sized campaign title here');
    });

    it('drops case-insensitive duplicates, keeping the first', () => {
      const r = rankVariants(
        ['From Lagos to Berlin', 'from lagos to berlin'],
        WINDOW,
      );
      expect(r.variants).toHaveLength(1);
    });

    it('recommends the variant closest to the target window', () => {
      const short = 'Too short'; // 9 chars, below min
      const good = 'A perfectly sized emotional title'; // within window
      const long = 'x'.repeat(200); // far above max
      const r = rankVariants([short, good, long], WINDOW);
      expect(r.recommendedIndex).toBe(1);
      expect(r.variants[1].recommended).toBe(true);
      expect(r.variants[0].recommended).toBe(false);
      expect(r.variants[2].recommended).toBe(false);
    });

    it('is deterministic: same input yields the same recommendation', () => {
      const input = ['alpha campaign title text', 'beta campaign title text'];
      const a = rankVariants(input, WINDOW);
      const b = rankVariants(input, WINDOW);
      expect(a.recommendedIndex).toBe(b.recommendedIndex);
    });

    it('breaks ties by earliest position', () => {
      // both inside the window → distance 0 → first wins
      const r = rankVariants(
        ['first inside the window text', 'second inside the window text'],
        WINDOW,
      );
      expect(r.recommendedIndex).toBe(0);
    });

    it('returns an empty result for all-empty input', () => {
      const r = rankVariants(
        ['', '   ', undefined as unknown as string],
        WINDOW,
      );
      expect(r.variants).toHaveLength(0);
      expect(r.recommendedIndex).toBe(-1);
    });

    it('exposes each variant length', () => {
      const r = rankVariants(['A perfectly sized emotional title'], WINDOW);
      expect(r.variants[0].length).toBe(
        'A perfectly sized emotional title'.length,
      );
    });
  });
});
