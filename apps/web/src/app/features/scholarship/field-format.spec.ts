import { conditionHint, fieldTypeLabel, isRubricField } from './field-format';

describe('fieldTypeLabel', () => {
  it('labels each field type', () => {
    expect(fieldTypeLabel('TEXT')).toBe('Short text');
    expect(fieldTypeLabel('LONG_TEXT')).toBe('Long text');
    expect(fieldTypeLabel('NUMBER')).toBe('Number');
    expect(fieldTypeLabel('SELECT')).toBe('Dropdown');
    expect(fieldTypeLabel('BOOLEAN')).toBe('Yes / No');
    expect(fieldTypeLabel('EMAIL')).toBe('Email');
  });

  it('falls back to the raw value for an unknown type', () => {
    expect(fieldTypeLabel('WHATEVER' as never)).toBe('WHATEVER');
  });
});

describe('isRubricField', () => {
  it('is true for a positive weight', () => {
    expect(isRubricField(3)).toBe(true);
  });

  it('is false for a zero weight', () => {
    expect(isRubricField(0)).toBe(false);
  });
});

describe('conditionHint', () => {
  it('returns null for an unconditional field', () => {
    expect(conditionHint(null, null)).toBeNull();
  });

  it('describes the conditional rule', () => {
    expect(conditionHint('leadership', 'Founder')).toBe('Shown when "leadership" is "Founder"');
  });

  it('handles a missing value gracefully', () => {
    expect(conditionHint('leadership', null)).toBe('Shown when "leadership" is ""');
  });
});
