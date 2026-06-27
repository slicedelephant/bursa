import { crossedMilestones, isGoalMilestone } from './milestone.util';

describe('crossedMilestones', () => {
  const goal = 10000;

  it('reports a single milestone crossed in one step', () => {
    expect(crossedMilestones(7000, 8200, goal)).toEqual([80]);
  });

  it('reports multiple milestones crossed in a big jump', () => {
    expect(crossedMilestones(5000, 9500, goal)).toEqual([80, 90]);
  });

  it('reports the goal milestone when reaching 100%', () => {
    expect(crossedMilestones(9500, 10000, goal)).toEqual([100]);
  });

  it('reports all three when jumping from low to fully funded', () => {
    expect(crossedMilestones(0, 10000, goal)).toEqual([80, 90, 100]);
  });

  it('reports nothing when no threshold is crossed', () => {
    expect(crossedMilestones(8100, 8500, goal)).toEqual([]);
    expect(crossedMilestones(0, 7000, goal)).toEqual([]);
  });

  it('does not re-fire a milestone already passed', () => {
    expect(crossedMilestones(8500, 8900, goal)).toEqual([]);
  });

  it('returns nothing for a non-positive goal', () => {
    expect(crossedMilestones(0, 5000, 0)).toEqual([]);
  });
});

describe('isGoalMilestone', () => {
  it('is true only for 100', () => {
    expect(isGoalMilestone(100)).toBe(true);
    expect(isGoalMilestone(80)).toBe(false);
    expect(isGoalMilestone(90)).toBe(false);
  });
});
