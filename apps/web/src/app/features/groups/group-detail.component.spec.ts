import { TestBed } from '@angular/core/testing';
import { GroupDetailView } from '../../core/models';
import { GroupDetailComponent } from './group-detail.component';

function cohortView(): GroupDetailView {
  return {
    group: {
      id: 'g1',
      mode: 'COHORT',
      visibility: 'PUBLIC',
      name: 'INSEAD 2026 Cohort',
      description: 'Classmates fundraising together.',
      logoUrl: null,
      sharedGoalCents: 3_000_000,
      stretchThresholdPct: 80,
    },
    role: 'ADMIN',
    memberCount: 2,
    sharedGoal: {
      raisedCents: 2_500_000,
      goalCents: 3_000_000,
      percent: 83,
      remainingCents: 500_000,
    },
    stretch: {
      unlocked: true,
      thresholdPct: 80,
      thresholdCents: 2_400_000,
      percent: 83,
      remainingToStretchCents: 0,
    },
    leaderboard: [{ id: 'u1', label: 'Amara', score: 1_200_000, rank: 1 }],
    members: [{ userId: 'u1', name: 'Amara', role: 'ADMIN' }],
    subCampaigns: [
      { campaignId: 'c1', title: "Amara's MBA", valueCents: 1_200_000, goalCents: 1_500_000 },
    ],
    analytics: {
      totalCents: 0,
      contributionCount: 0,
      distinctTargets: 0,
      impactPerTargetCents: 0,
      memberCount: 2,
      goalPercent: 0,
      activeWeek: '2026-W26',
    },
  };
}

function circleView(): GroupDetailView {
  const base = cohortView();
  return {
    ...base,
    group: { ...base.group, mode: 'GIVING_CIRCLE', name: 'Lagos Circle' },
    subCampaigns: undefined,
    contributions: [{ campaignId: 'c1', title: 'Amara', valueCents: 300_000 }],
  };
}

describe('GroupDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupDetailComponent],
    }).compileComponents();
  });

  function render(v: GroupDetailView) {
    const fixture = TestBed.createComponent(GroupDetailComponent);
    fixture.componentRef.setInput('view', v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the cohort header, progress and unlocked stretch', () => {
    const el = render(cohortView());
    expect(el.textContent).toContain('Cohort team');
    expect(el.textContent).toContain('INSEAD 2026 Cohort');
    expect(el.textContent).toContain('83% of goal');
    expect(el.textContent).toContain('Stretch reward unlocked');
  });

  it('shows sub-campaigns for a cohort', () => {
    const el = render(cohortView());
    expect(el.textContent).toContain('Sub-campaigns');
    expect(el.textContent).toContain("Amara's MBA");
  });

  it('shows the group portfolio for a circle', () => {
    const el = render(circleView());
    expect(el.textContent).toContain('Giving circle');
    expect(el.textContent).toContain('Group portfolio');
  });

  it('renders the leaderboard and members', () => {
    const el = render(cohortView());
    expect(el.textContent).toContain('#1 Amara');
    expect(el.textContent).toContain('Admin');
  });

  it('shows an empty message when there are no parts', () => {
    const el = render({ ...cohortView(), subCampaigns: [] });
    expect(el.textContent).toContain('No sub-campaigns linked yet.');
  });

  it('shows the circle empty-portfolio message', () => {
    const el = render({ ...circleView(), contributions: [] });
    expect(el.textContent).toContain('No contributions yet.');
  });

  it('falls back to an empty parts list for a circle with no contributions field', () => {
    const view = circleView();
    delete (view as { contributions?: unknown }).contributions;
    const el = render(view);
    expect(el.textContent).toContain('Group portfolio');
    expect(el.textContent).toContain('No contributions yet.');
  });
});
