import { TestBed } from '@angular/core/testing';
import { AdvocateDashboardView } from '../../core/models';
import { AdvocateManagerComponent } from './advocate-manager.component';

const dashboard = (over: Partial<AdvocateDashboardView> = {}): AdvocateDashboardView => ({
  campaignId: 'c1',
  advocateCount: 1,
  remaining: 14,
  advocates: [
    {
      id: 'a',
      name: 'Ada',
      email: null,
      referralCount: 6,
      reward: {
        count: 6,
        tier: 'SILVER',
        nextTier: 'GOLD',
        toNext: 4,
        perk: 'RECAP',
        bothWin: true,
      },
      rank: 1,
    },
  ],
  leaderboard: [{ id: 'a', label: 'Ada', score: 6, rank: 1 }],
  ...over,
});

describe('AdvocateManagerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvocateManagerComponent],
    }).compileComponents();
  });

  function render(view: AdvocateDashboardView) {
    const fixture = TestBed.createComponent(AdvocateManagerComponent);
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    return fixture;
  }

  it('shows remaining invites, advocates and the leaderboard', () => {
    const el = render(dashboard()).nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="remaining"]')?.textContent).toContain('14 of 15');
    expect(el.textContent).toContain('Ada');
    expect(el.textContent).toContain('6 referrals');
    expect(el.textContent).toContain('Silver advocate');
    expect(el.textContent).toContain('Top advocates');
  });

  it('emits an invite with name + email and clears the form', () => {
    const fixture = render(dashboard());
    const emitted: { name: string; email?: string }[] = [];
    fixture.componentInstance.invite.subscribe((e) => emitted.push(e));
    fixture.componentInstance.name.set('Jordan');
    fixture.componentInstance.email.set('jordan@example.com');
    fixture.componentInstance.submit();
    expect(emitted).toEqual([{ name: 'Jordan', email: 'jordan@example.com' }]);
    expect(fixture.componentInstance.name()).toBe('');
  });

  it('emits without email when none is given', () => {
    const fixture = render(dashboard());
    const emitted: { name: string; email?: string }[] = [];
    fixture.componentInstance.invite.subscribe((e) => emitted.push(e));
    fixture.componentInstance.name.set('Tunde');
    fixture.componentInstance.submit();
    expect(emitted).toEqual([{ name: 'Tunde' }]);
  });

  it('ignores an empty-name submit', () => {
    const fixture = render(dashboard());
    let count = 0;
    fixture.componentInstance.invite.subscribe(() => (count += 1));
    fixture.componentInstance.name.set('   ');
    fixture.componentInstance.submit();
    expect(count).toBe(0);
  });

  it('hides the invite form at the advocate limit', () => {
    const el = render(dashboard({ remaining: 0 })).nativeElement as HTMLElement;
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('15-advocate limit');
  });
});
