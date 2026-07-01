import { evaluateVisibility } from './conditional-logic';
import { FormFieldSpec } from './form-schema.validator';

const fields: FormFieldSpec[] = [
  {
    fieldKey: 'leadership',
    label: 'Leadership',
    type: 'SELECT',
    options: ['None', 'Founder'],
  },
  {
    fieldKey: 'founderStory',
    label: 'Story',
    type: 'LONG_TEXT',
    showIfFieldId: 'leadership',
    showIfValue: 'Founder',
  },
];

describe('evaluateVisibility', () => {
  it('always shows unconditional fields', () => {
    const map = evaluateVisibility(fields, {});
    expect(map.leadership).toBe(true);
  });

  it('shows a conditional field when the dependency matches', () => {
    const map = evaluateVisibility(fields, { leadership: 'Founder' });
    expect(map.founderStory).toBe(true);
  });

  it('hides a conditional field when the dependency does not match', () => {
    const map = evaluateVisibility(fields, { leadership: 'None' });
    expect(map.founderStory).toBe(false);
  });

  it('hides a conditional field when the dependency answer is missing', () => {
    const map = evaluateVisibility(fields, {});
    expect(map.founderStory).toBe(false);
  });

  it('does not mutate the answers input', () => {
    const answers = { leadership: 'Founder' };
    const copy = { ...answers };
    evaluateVisibility(fields, answers);
    expect(answers).toEqual(copy);
  });
});
