import { copyText, displayLink } from './referral-link';

describe('referral-link', () => {
  describe('displayLink', () => {
    it('drops the https scheme', () => {
      expect(displayLink('https://bursa.app/r/abc')).toBe('bursa.app/r/abc');
    });

    it('drops the http scheme', () => {
      expect(displayLink('http://bursa.app/r/abc')).toBe('bursa.app/r/abc');
    });

    it('leaves a scheme-less value unchanged', () => {
      expect(displayLink('bursa.app/r/abc')).toBe('bursa.app/r/abc');
    });
  });

  describe('copyText', () => {
    it('includes the full link and the school-direct framing', () => {
      const text = copyText('https://bursa.app/r/abc');
      expect(text).toContain('https://bursa.app/r/abc');
      expect(text).toContain('directly to their school');
    });
  });
});
