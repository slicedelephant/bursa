import { euros, modeLabel, sharedGoalText, stretchText, visibilityLabel } from './group-format';

describe('group-format', () => {
  it('labels the group mode', () => {
    expect(modeLabel('COHORT')).toBe('Cohort team');
    expect(modeLabel('GIVING_CIRCLE')).toBe('Giving circle');
  });

  it('labels visibility', () => {
    expect(visibilityLabel('PUBLIC')).toBe('Public');
    expect(visibilityLabel('PRIVATE')).toBe('Private');
  });

  it('formats the shared-goal percent', () => {
    expect(
      sharedGoalText({ raisedCents: 0, goalCents: 100, percent: 83, remainingCents: 17 }),
    ).toBe('83% of goal');
  });

  it('formats euros from cents', () => {
    expect(euros(250000)).toBe('2,500');
    expect(euros(0)).toBe('0');
    expect(euros(-500)).toBe('0');
  });

  it('shows the unlocked stretch reward', () => {
    expect(
      stretchText({
        unlocked: true,
        thresholdPct: 80,
        thresholdCents: 0,
        percent: 90,
        remainingToStretchCents: 0,
      }),
    ).toBe('Stretch reward unlocked at 80%!');
  });

  it('shows the remaining amount for a locked stretch', () => {
    expect(
      stretchText({
        unlocked: false,
        thresholdPct: 80,
        thresholdCents: 240000,
        percent: 50,
        remainingToStretchCents: 90000,
      }),
    ).toBe('€900 to unlock the 80% stretch reward');
  });
});
