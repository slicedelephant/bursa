import { DELETE_CONFIRM_TEXT, exportFilename, exportJson } from './account-security';

describe('exportFilename', () => {
  it('builds a date-stamped json filename', () => {
    expect(exportFilename(new Date('2026-06-27T10:00:00Z'))).toBe(
      'bursa-data-export-2026-06-27.json',
    );
  });

  it('defaults to now', () => {
    expect(exportFilename()).toMatch(/^bursa-data-export-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('exportJson', () => {
  it('pretty-prints the payload', () => {
    const json = exportJson({ a: 1, b: ['x'] });
    expect(json).toContain('"a": 1');
    expect(json).toContain('\n');
    expect(JSON.parse(json)).toEqual({ a: 1, b: ['x'] });
  });
});

describe('DELETE_CONFIRM_TEXT', () => {
  it('warns that the action is irreversible and preserves the money trail', () => {
    expect(DELETE_CONFIRM_TEXT).toContain('anonymises');
    expect(DELETE_CONFIRM_TEXT).toContain('money trail');
  });
});
