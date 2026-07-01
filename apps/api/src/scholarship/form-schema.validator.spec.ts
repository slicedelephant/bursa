import { FormFieldSpec, validateFormSchema } from './form-schema.validator';

const base: FormFieldSpec[] = [
  {
    fieldKey: 'why',
    label: 'Why you?',
    type: 'LONG_TEXT',
    required: true,
    rubricWeight: 3,
  },
  {
    fieldKey: 'leadership',
    label: 'Leadership',
    type: 'SELECT',
    required: true,
    options: ['None', 'Team lead', 'Founder'],
    rubricWeight: 2,
  },
];

describe('validateFormSchema', () => {
  it('accepts a valid schema', () => {
    const res = validateFormSchema(base);
    expect(res).toEqual({ valid: true, errors: [] });
  });

  it('rejects an empty form', () => {
    const res = validateFormSchema([]);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Form must have at least one field');
  });

  it('flags duplicate field keys', () => {
    const res = validateFormSchema([base[0], { ...base[0] }]);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Duplicate field key: why'))).toBe(
      true,
    );
  });

  it('requires options on a SELECT field', () => {
    const res = validateFormSchema([
      { fieldKey: 'pick', label: 'Pick', type: 'SELECT', options: [] },
    ]);
    expect(res.valid).toBe(false);
    expect(
      res.errors.some((e) => e.includes('needs at least one option')),
    ).toBe(true);
  });

  it('rejects invalid field keys', () => {
    const res = validateFormSchema([
      { fieldKey: '1bad', label: 'X', type: 'TEXT' },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('Invalid field key'))).toBe(true);
  });

  it('rejects a missing label', () => {
    const res = validateFormSchema([
      { fieldKey: 'ok', label: '  ', type: 'TEXT' },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('missing a label'))).toBe(true);
  });

  it('rejects a negative rubric weight', () => {
    const res = validateFormSchema([
      { fieldKey: 'ok', label: 'Ok', type: 'TEXT', rubricWeight: -1 },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('negative rubric weight'))).toBe(
      true,
    );
  });

  it('rejects a conditional reference to an unknown field', () => {
    const res = validateFormSchema([
      {
        fieldKey: 'a',
        label: 'A',
        type: 'TEXT',
        showIfFieldId: 'ghost',
        showIfValue: 'x',
      },
    ]);
    expect(res.valid).toBe(false);
    expect(
      res.errors.some((e) => e.includes('unknown showIf field ghost')),
    ).toBe(true);
  });

  it('rejects a field depending on itself', () => {
    const res = validateFormSchema([
      {
        fieldKey: 'a',
        label: 'A',
        type: 'TEXT',
        showIfFieldId: 'a',
        showIfValue: 'x',
      },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('cannot depend on itself'))).toBe(
      true,
    );
  });

  it('does not mutate the input array', () => {
    const input = [...base];
    const copy = JSON.parse(JSON.stringify(input));
    validateFormSchema(input);
    expect(input).toEqual(copy);
  });
});
