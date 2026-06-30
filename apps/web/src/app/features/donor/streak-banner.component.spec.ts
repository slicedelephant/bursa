import { TestBed } from '@angular/core/testing';
import { BadgeProgress, StreakState } from '../../core/models';
import { StreakBannerComponent } from './streak-banner.component';

describe('StreakBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreakBannerComponent],
    }).compileComponents();
  });

  function render(streak: StreakState, badge: BadgeProgress) {
    const fixture = TestBed.createComponent(StreakBannerComponent);
    fixture.componentRef.setInput('streak', streak);
    fixture.componentRef.setInput('badge', badge);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the current streak, badge and next milestone', () => {
    const el = render(
      {
        currentMonths: 7,
        longestMonths: 7,
        currentMonthCovered: true,
        lastActiveMonth: '2026-06',
      },
      { tier: 'SILVER', streakMonths: 7, nextTier: 'GOLD', monthsToNextTier: 5 },
    );
    expect(el.textContent).toContain('7 months in a row');
    expect(el.textContent).toContain('Silver giver');
    expect(el.textContent).toContain('5 months to Gold giver');
  });

  it('prompts a start when there is no streak', () => {
    const el = render(
      {
        currentMonths: 0,
        longestMonths: 0,
        currentMonthCovered: false,
        lastActiveMonth: null,
      },
      { tier: 'NONE', streakMonths: 0, nextTier: 'BRONZE', monthsToNextTier: 3 },
    );
    expect(el.textContent).toContain('Start your giving streak this month');
    expect(el.textContent).toContain('No badge yet');
  });
});
