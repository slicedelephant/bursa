import {
  isPartialTribute,
  normalizeTribute,
  tributeLine,
} from './tribute.util';

describe('normalizeTribute', () => {
  it('returns a tribute when both type and name are present', () => {
    expect(normalizeTribute({ type: 'HONOR', name: 'Prof. Mensah' })).toEqual({
      type: 'HONOR',
      name: 'Prof. Mensah',
    });
  });

  it('trims the name', () => {
    expect(normalizeTribute({ type: 'MEMORY', name: '  Ada  ' })).toEqual({
      type: 'MEMORY',
      name: 'Ada',
    });
  });

  it('returns null when the name is missing or blank', () => {
    expect(normalizeTribute({ type: 'HONOR', name: '   ' })).toBeNull();
    expect(normalizeTribute({ type: 'HONOR' })).toBeNull();
  });

  it('returns null when the type is missing', () => {
    expect(normalizeTribute({ name: 'Ada' })).toBeNull();
    expect(normalizeTribute({})).toBeNull();
  });
});

describe('tributeLine', () => {
  it('formats an honour dedication', () => {
    expect(tributeLine('HONOR', 'Prof. Mensah')).toBe('In honour of Prof. Mensah');
  });

  it('formats a memory dedication', () => {
    expect(tributeLine('MEMORY', 'Ada')).toBe('In memory of Ada');
  });

  it('returns null for an invalid tribute', () => {
    expect(tributeLine(null, 'Ada')).toBeNull();
    expect(tributeLine('HONOR', '')).toBeNull();
  });
});

describe('isPartialTribute', () => {
  it('is true when exactly one field is set', () => {
    expect(isPartialTribute({ type: 'HONOR' })).toBe(true);
    expect(isPartialTribute({ name: 'Ada' })).toBe(true);
  });

  it('is false when both or neither are set', () => {
    expect(isPartialTribute({ type: 'HONOR', name: 'Ada' })).toBe(false);
    expect(isPartialTribute({})).toBe(false);
    expect(isPartialTribute({ name: '   ' })).toBe(false);
  });
});
