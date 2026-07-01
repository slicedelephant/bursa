import { CycleState, planRenewal } from './program-cycle';

const cycle: CycleState = {
  year: 2026,
  budgetCents: 6_000_000,
  slots: 3,
  awardCents: 2_000_000,
};

const NOW = new Date('2026-11-15T00:00:00.000Z');

describe('planRenewal', () => {
  it('advances the year by one', () => {
    expect(planRenewal({ cycle, now: NOW }).year).toBe(2027);
  });

  it('repeats last year config when no overrides are given', () => {
    const plan = planRenewal({ cycle, now: NOW });
    expect(plan.budgetCents).toBe(6_000_000);
    expect(plan.slots).toBe(3);
    expect(plan.awardCents).toBe(2_000_000);
    expect(plan.deadline).toBeNull();
  });

  it('applies overrides for budget, slots and award', () => {
    const plan = planRenewal({
      cycle,
      now: NOW,
      budgetCents: 6_600_000,
      slots: 4,
      awardCents: 2_200_000,
    });
    expect(plan.budgetCents).toBe(6_600_000);
    expect(plan.slots).toBe(4);
    expect(plan.awardCents).toBe(2_200_000);
  });

  it('always flags the form schema to be copied', () => {
    expect(planRenewal({ cycle, now: NOW }).copyFormSchema).toBe(true);
  });

  it('derives a deadline from now + deadlineMonths', () => {
    const plan = planRenewal({ cycle, now: NOW, deadlineMonths: 3 });
    expect(plan.deadline?.toISOString()).toBe('2027-02-15T00:00:00.000Z');
  });

  it('does not mutate the cycle input', () => {
    const copy = { ...cycle };
    planRenewal({ cycle, now: NOW });
    expect(cycle).toEqual(copy);
  });
});
