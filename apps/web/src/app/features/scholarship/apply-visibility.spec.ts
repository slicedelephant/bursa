import { PublicFormField } from '../../core/models';
import { computeVisibility, visibleFields } from './apply-visibility';

const fields: PublicFormField[] = [
  {
    fieldKey: 'leadership',
    label: 'Leadership',
    type: 'SELECT',
    required: true,
    options: ['None', 'Founder'],
    showIfFieldId: null,
    showIfValue: null,
  },
  {
    fieldKey: 'founderStory',
    label: 'Story',
    type: 'LONG_TEXT',
    required: true,
    options: [],
    showIfFieldId: 'leadership',
    showIfValue: 'Founder',
  },
];

describe('computeVisibility', () => {
  it('always shows unconditional fields', () => {
    expect(computeVisibility(fields, {}).leadership).toBe(true);
  });

  it('shows a conditional field when the dependency matches', () => {
    expect(computeVisibility(fields, { leadership: 'Founder' }).founderStory).toBe(true);
  });

  it('hides a conditional field when the dependency does not match', () => {
    expect(computeVisibility(fields, { leadership: 'None' }).founderStory).toBe(false);
  });

  it('hides a conditional field when the dependency is unanswered', () => {
    expect(computeVisibility(fields, {}).founderStory).toBe(false);
  });

  it('does not mutate the answers input', () => {
    const answers = { leadership: 'Founder' };
    const copy = { ...answers };
    computeVisibility(fields, answers);
    expect(answers).toEqual(copy);
  });
});

describe('visibleFields', () => {
  it('drops hidden conditional fields', () => {
    const shown = visibleFields(fields, { leadership: 'None' });
    expect(shown.map((f) => f.fieldKey)).toEqual(['leadership']);
  });

  it('includes a shown conditional field', () => {
    const shown = visibleFields(fields, { leadership: 'Founder' });
    expect(shown.map((f) => f.fieldKey)).toEqual(['leadership', 'founderStory']);
  });
});
