import { parseAdmissionCsv } from './admission-import';

describe('parseAdmissionCsv', () => {
  it('parses a clean CSV with a header row', () => {
    const csv = [
      'email,name,program,admissionRef',
      'amara@bursa.test,Amara Okeke,MBA 2026,ADM-1',
      '"kofi@bursa.test","Kofi Mensah","Global MBA",ADM-2',
    ].join('\n');
    const result = parseAdmissionCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.duplicates).toBe(0);
    expect(result.records).toEqual([
      {
        studentEmail: 'amara@bursa.test',
        studentName: 'Amara Okeke',
        programName: 'MBA 2026',
        admissionRef: 'ADM-1',
      },
      {
        studentEmail: 'kofi@bursa.test',
        studentName: 'Kofi Mensah',
        programName: 'Global MBA',
        admissionRef: 'ADM-2',
      },
    ]);
  });

  it('is tolerant of column order, casing and CRLF', () => {
    const csv =
      'Name,Email,AdmissionRef,Program\r\nAmara,AMARA@bursa.test,ADM-9,MBA\r\n';
    const result = parseAdmissionCsv(csv);
    expect(result.records).toEqual([
      {
        studentEmail: 'amara@bursa.test',
        studentName: 'Amara',
        programName: 'MBA',
        admissionRef: 'ADM-9',
      },
    ]);
  });

  it('reports missing required columns and parses nothing', () => {
    const result = parseAdmissionCsv('email,name\nx@y.z,Bob');
    expect(result.records).toEqual([]);
    expect(result.errors.map((e) => e.message)).toEqual([
      'Missing required column: program',
      'Missing required column: admissionref',
    ]);
  });

  it('collects per-row errors but keeps the valid rows', () => {
    const csv = [
      'email,name,program,admissionRef',
      'not-an-email,Bob,MBA,ADM-1',
      'good@bursa.test,,MBA,ADM-2',
      'fine@bursa.test,Lin,MBA,ADM-3',
    ].join('\n');
    const result = parseAdmissionCsv(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].admissionRef).toBe('ADM-3');
    expect(result.errors).toEqual([
      { line: 2, message: 'invalid email' },
      { line: 3, message: 'missing name' },
    ]);
  });

  it('counts duplicate admissionRefs and keeps the first', () => {
    const csv = [
      'email,name,program,admissionRef',
      'a@bursa.test,A,MBA,ADM-1',
      'b@bursa.test,B,MBA,adm-1',
    ].join('\n');
    const result = parseAdmissionCsv(csv);
    expect(result.records).toHaveLength(1);
    expect(result.duplicates).toBe(1);
  });

  it('flags a row with too few columns and skips blank body lines', () => {
    const csv = [
      'email,name,program,admissionRef',
      'a@bursa.test,Amara,MBA', // missing admissionRef cell
      '',
      'b@bursa.test,Bob,MBA,ADM-2',
    ].join('\n');
    const result = parseAdmissionCsv(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].admissionRef).toBe('ADM-2');
    expect(result.errors).toEqual([
      { line: 2, message: 'missing admissionRef' },
    ]);
  });

  it('treats blank or non-string input as an empty CSV', () => {
    expect(parseAdmissionCsv('').errors[0].message).toBe('CSV is empty');
    expect(parseAdmissionCsv('   \n  ').errors[0].message).toBe('CSV is empty');
    expect(
      parseAdmissionCsv(undefined as unknown as string).errors[0].message,
    ).toBe('CSV is empty');
  });
});
