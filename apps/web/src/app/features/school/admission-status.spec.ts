import {
  admissionStatusClass,
  admissionStatusLabel,
  hasImportProblems,
  importSummary,
} from './admission-status';

describe('admission-status', () => {
  it('labels each status', () => {
    expect(admissionStatusLabel('PENDING')).toBe('Pending');
    expect(admissionStatusLabel('VERIFIED')).toBe('Verified');
    expect(admissionStatusLabel('REJECTED')).toBe('Rejected');
    expect(admissionStatusLabel('X' as never)).toBe('Unknown');
  });

  it('maps each status to a chip class', () => {
    expect(admissionStatusClass('VERIFIED')).toContain('brand-green');
    expect(admissionStatusClass('REJECTED')).toContain('brand-orange');
    expect(admissionStatusClass('PENDING')).toContain('amber');
  });

  it('summarises a clean import', () => {
    expect(importSummary({ imported: 5, duplicates: 0, errors: [] })).toBe('5 imported');
  });

  it('summarises an import with duplicates and errors (with pluralisation)', () => {
    expect(
      importSummary({ imported: 3, duplicates: 1, errors: [{ line: 2, message: 'invalid email' }] }),
    ).toBe('3 imported · 1 duplicate skipped · 1 row error');
    expect(
      importSummary({ imported: 0, duplicates: 2, errors: [{ line: 2, message: 'a' }, { line: 3, message: 'b' }] }),
    ).toBe('0 imported · 2 duplicates skipped · 2 row errors');
  });

  it('flags whether an import had problems', () => {
    expect(hasImportProblems({ imported: 5, duplicates: 0, errors: [] })).toBe(false);
    expect(hasImportProblems({ imported: 5, duplicates: 1, errors: [] })).toBe(true);
    expect(hasImportProblems({ imported: 5, duplicates: 0, errors: [{ line: 1, message: 'x' }] })).toBe(true);
  });
});
