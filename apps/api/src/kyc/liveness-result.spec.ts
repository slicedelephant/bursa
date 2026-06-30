import {
  LIVENESS_MIN_CONFIDENCE,
  clampConfidence,
  evaluateLiveness,
} from './liveness-result';

describe('liveness-result', () => {
  describe('clampConfidence', () => {
    it('clamps below 0 to 0', () => {
      expect(clampConfidence(-5)).toBe(0);
    });
    it('clamps above 100 to 100', () => {
      expect(clampConfidence(140)).toBe(100);
    });
    it('rounds fractional values', () => {
      expect(clampConfidence(81.6)).toBe(82);
    });
    it('treats NaN/Infinity as 0', () => {
      expect(clampConfidence(NaN)).toBe(0);
      expect(clampConfidence(Infinity)).toBe(0);
    });
  });

  describe('evaluateLiveness', () => {
    it('passes at exactly the threshold', () => {
      const result = evaluateLiveness(LIVENESS_MIN_CONFIDENCE);
      expect(result.passed).toBe(true);
      expect(result.confidence).toBe(LIVENESS_MIN_CONFIDENCE);
    });
    it('passes above the threshold', () => {
      expect(evaluateLiveness(95).passed).toBe(true);
    });
    it('fails below the threshold', () => {
      const result = evaluateLiveness(40);
      expect(result.passed).toBe(false);
      expect(result.confidence).toBe(40);
    });
    it('fails on a clamped negative input', () => {
      expect(evaluateLiveness(-1).passed).toBe(false);
    });
  });
});
