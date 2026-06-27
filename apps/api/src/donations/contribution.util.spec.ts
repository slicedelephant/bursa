import { splitContribution } from './contribution.util';

describe('splitContribution', () => {
  it('keeps the full amount toward the goal when it fits', () => {
    expect(splitContribution(10000, 0, 5000)).toEqual({
      amountToGoal: 5000,
      tip: 0,
    });
  });

  it('caps the goal-bound amount and routes the excess to a tip', () => {
    expect(splitContribution(10000, 8000, 5000)).toEqual({
      amountToGoal: 2000,
      tip: 3000,
    });
  });

  it('adds the excess on top of an explicit base tip', () => {
    expect(splitContribution(10000, 9000, 5000, 100)).toEqual({
      amountToGoal: 1000,
      tip: 100 + 4000,
    });
  });

  it('treats an already-met goal as zero remaining (all becomes tip)', () => {
    expect(splitContribution(10000, 10000, 5000)).toEqual({
      amountToGoal: 0,
      tip: 5000,
    });
  });

  it('never produces negative remaining when over-funded', () => {
    expect(splitContribution(10000, 12000, 3000)).toEqual({
      amountToGoal: 0,
      tip: 3000,
    });
  });

  it('preserves an explicit base tip when the amount fits', () => {
    expect(splitContribution(10000, 0, 4000, 500)).toEqual({
      amountToGoal: 4000,
      tip: 500,
    });
  });
});
