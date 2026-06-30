import { amlNextStep, amlStatusClass, amlStatusLabel } from './aml-status';

describe('aml-status', () => {
  describe('amlStatusLabel', () => {
    it('labels decisions', () => {
      expect(amlStatusLabel('CLEAR')).toBe('Cleared');
      expect(amlStatusLabel('HIT')).toBe('Flagged for review');
      expect(amlStatusLabel('BLOCKED')).toBe('Blocked');
    });
  });

  describe('amlStatusClass', () => {
    it('maps decisions to colour chips', () => {
      expect(amlStatusClass('CLEAR')).toContain('brand-green');
      expect(amlStatusClass('BLOCKED')).toContain('brand-orange');
      expect(amlStatusClass('HIT')).toContain('amber');
    });
  });

  describe('amlNextStep', () => {
    it('explains each outcome', () => {
      expect(amlNextStep('VERIFIED')).toMatch(/passed/i);
      expect(amlNextStep('MANUAL_REVIEW')).toMatch(/reviewing/i);
      expect(amlNextStep('REJECTED')).toMatch(/could not/i);
      expect(amlNextStep('STARTED')).toMatch(/progress/i);
    });
  });
});
