import { tributeLine } from './tribute-display';

describe('tributeLine (frontend)', () => {
  it('formats honour and memory dedications', () => {
    expect(tributeLine('HONOR', 'Prof. Mensah')).toBe('In honour of Prof. Mensah');
    expect(tributeLine('MEMORY', 'Ada')).toBe('In memory of Ada');
  });

  it('trims the name', () => {
    expect(tributeLine('HONOR', '  Ada  ')).toBe('In honour of Ada');
  });

  it('returns null when type or name is missing', () => {
    expect(tributeLine(null, 'Ada')).toBeNull();
    expect(tributeLine('HONOR', '')).toBeNull();
    expect(tributeLine('HONOR', '   ')).toBeNull();
    expect(tributeLine(undefined, undefined)).toBeNull();
  });
});
