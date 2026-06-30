import { TestBed } from '@angular/core/testing';
import { LeaderboardEntry } from '../../core/models';
import { AdvocateLeaderboardComponent } from './advocate-leaderboard.component';

describe('AdvocateLeaderboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdvocateLeaderboardComponent],
    }).compileComponents();
  });

  function render(entries: LeaderboardEntry[]) {
    const fixture = TestBed.createComponent(AdvocateLeaderboardComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders ranked advocates with referral counts', () => {
    const el = render([
      { id: 'a', label: 'Ada', score: 6, rank: 1 },
      { id: 'b', label: 'Bea', score: 1, rank: 2 },
    ]);
    expect(el.textContent).toContain('#1');
    expect(el.textContent).toContain('Ada');
    expect(el.textContent).toContain('6 referrals');
    expect(el.textContent).toContain('1 referral'); // singular
  });

  it('shows an empty state when there are no advocates', () => {
    const el = render([]);
    expect(el.textContent).toContain('No advocates yet');
  });
});
