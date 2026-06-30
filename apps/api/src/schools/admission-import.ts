// Pure admission-list parser/validator (E8). Accepts a CSV the school-admin
// pastes/uploads and returns clean records + per-row errors + duplicate count.
// No NestJS, no I/O; never mutates its input. Deliberately a small CSV reader
// (comma-separated, optional surrounding quotes; embedded commas are out of scope).

export interface ParsedAdmission {
  readonly studentEmail: string;
  readonly studentName: string;
  readonly programName: string;
  readonly admissionRef: string;
}

export interface AdmissionRowError {
  readonly line: number;
  readonly message: string;
}

export interface AdmissionImportResult {
  readonly records: readonly ParsedAdmission[];
  readonly errors: readonly AdmissionRowError[];
  readonly duplicates: number;
}

export const REQUIRED_COLUMNS = [
  'email',
  'name',
  'program',
  'admissionref',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitLine(line: string): string[] {
  return line.split(',').map((cell) =>
    cell
      .trim()
      .replace(/^"(.*)"$/, '$1')
      .trim(),
  );
}

const empty = (message: string): AdmissionImportResult => ({
  records: [],
  errors: [{ line: 0, message }],
  duplicates: 0,
});

export function parseAdmissionCsv(csv: string): AdmissionImportResult {
  if (typeof csv !== 'string' || csv.trim().length === 0) {
    return empty('CSV is empty');
  }

  const lines = csv.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) => line.trim().length > 0);
  if (headerIdx === -1) {
    return empty('CSV is empty');
  }

  const headerCols = splitLine(lines[headerIdx]).map((c) =>
    c.toLowerCase().replace(/\s+/g, ''),
  );
  const colIndex: Record<string, number> = {};
  const headerErrors: AdmissionRowError[] = [];
  for (const column of REQUIRED_COLUMNS) {
    const idx = headerCols.indexOf(column);
    if (idx === -1) {
      headerErrors.push({
        line: headerIdx + 1,
        message: `Missing required column: ${column}`,
      });
    } else {
      colIndex[column] = idx;
    }
  }
  if (headerErrors.length > 0) {
    return { records: [], errors: headerErrors, duplicates: 0 };
  }

  const records: ParsedAdmission[] = [];
  const errors: AdmissionRowError[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    if (lines[i].trim().length === 0) continue;
    const cols = splitLine(lines[i]);
    const line = i + 1;
    const email = cols[colIndex.email] ?? '';
    const name = cols[colIndex.name] ?? '';
    const program = cols[colIndex.program] ?? '';
    const admissionRef = cols[colIndex.admissionref] ?? '';

    const rowErrors: string[] = [];
    if (!EMAIL_RE.test(email)) rowErrors.push('invalid email');
    if (name.length === 0) rowErrors.push('missing name');
    if (program.length === 0) rowErrors.push('missing program');
    if (admissionRef.length === 0) rowErrors.push('missing admissionRef');
    if (rowErrors.length > 0) {
      errors.push({ line, message: rowErrors.join(', ') });
      continue;
    }

    const key = admissionRef.toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    records.push({
      studentEmail: email.toLowerCase(),
      studentName: name,
      programName: program,
      admissionRef,
    });
  }

  return { records, errors, duplicates };
}
