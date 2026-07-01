import { validateAnswers } from './answer.validator';
import { evaluateVisibility } from './conditional-logic';
import { FormFieldSpec } from './form-schema.validator';

const fields: FormFieldSpec[] = [
  { fieldKey: 'why', label: 'Why', type: 'LONG_TEXT', required: true },
  { fieldKey: 'age', label: 'Age', type: 'NUMBER', required: true },
  { fieldKey: 'email', label: 'Email', type: 'EMAIL', required: true },
  { fieldKey: 'leadership', label: 'Lead', type: 'SELECT', required: true, options: ['None', 'Founder'] },
  {
    fieldKey: 'founderStory',
    label: 'Story',
    type: 'LONG_TEXT',
    required: true,
    showIfFieldId: 'leadership',
    showIfValue: 'Founder',
  },
];

function validate(answers: Record<string, string | undefined>) {
  const visibility = evaluateVisibility(fields, answers);
  return validateAnswers({ fields, answers, visibility });
}

describe('validateAnswers', () => {
  it('accepts a complete, well-typed submission', () => {
    const res = validate({
      why: 'Because.',
      age: '29',
      email: 'a@b.co',
      leadership: 'Founder',
      founderStory: 'I built X.',
    });
    expect(res).toEqual({ valid: true, errors: [] });
  });

  it('flags a missing required field', () => {
    const res = validate({ age: '29', email: 'a@b.co', leadership: 'None' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('why is required');
  });

  it('skips a hidden conditional required field', () => {
    const res = validate({ why: 'x', age: '29', email: 'a@b.co', leadership: 'None' });
    expect(res.valid).toBe(true);
  });

  it('requires a shown conditional field', () => {
    const res = validate({ why: 'x', age: '29', email: 'a@b.co', leadership: 'Founder' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('founderStory is required');
  });

  it('rejects a non-numeric NUMBER', () => {
    const res = validate({ why: 'x', age: 'old', email: 'a@b.co', leadership: 'None' });
    expect(res.errors).toContain('age must be a number');
  });

  it('rejects an invalid email', () => {
    const res = validate({ why: 'x', age: '1', email: 'nope', leadership: 'None' });
    expect(res.errors).toContain('email must be a valid email');
  });

  it('rejects a SELECT value outside the options', () => {
    const res = validate({ why: 'x', age: '1', email: 'a@b.co', leadership: 'Wizard' });
    expect(res.errors).toContain('leadership must be one of the allowed options');
  });

  it('rejects a non-boolean BOOLEAN', () => {
    const boolFields: FormFieldSpec[] = [
      { fieldKey: 'agree', label: 'Agree', type: 'BOOLEAN', required: true },
    ];
    const res = validateAnswers({
      fields: boolFields,
      answers: { agree: 'yes' },
      visibility: { agree: true },
    });
    expect(res.errors).toContain('agree must be true or false');
  });
});
