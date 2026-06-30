import { TestBed } from '@angular/core/testing';
import { DonorReferralView } from '../../core/models';
import { ReferralPanelComponent } from './referral-panel.component';

const view: DonorReferralView = {
  link: { code: 'abc', shareUrl: 'https://bursa.app/r/abc' },
  stats: {
    invited: 14,
    donated: 5,
    active: 2,
    conversionPct: 35.7,
    viralCoefficient: 0.36,
    label: '14 invited, 5 donated, 2 active',
  },
  reward: {
    count: 5,
    tier: 'SILVER',
    nextTier: 'GOLD',
    toNext: 5,
    perk: 'RECAP',
    bothWin: true,
  },
  optInLeaderboard: false,
  templates: {
    email: { subject: 'Help', body: 'body https://bursa.app/r/abc' },
    whatsapp: { body: 'wa' },
    linkedin: { body: 'li' },
  },
};

describe('ReferralPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralPanelComponent],
    }).compileComponents();
  });

  function render(v: DonorReferralView = view) {
    const fixture = TestBed.createComponent(ReferralPanelComponent);
    fixture.componentRef.setInput('view', v);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the link, tracking tiles, tier and channels', () => {
    const el = render().nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="referral-link"]')?.textContent).toContain(
      'bursa.app/r/abc',
    );
    expect(el.textContent).toContain('Silver advocate');
    expect(el.textContent).toContain('Invited');
    expect(el.querySelectorAll('a').length).toBe(3); // whatsapp/telegram/email
  });

  it('emits the copy text when Copy is clicked', () => {
    const fixture = render();
    const emitted: string[] = [];
    fixture.componentInstance.copyRequested.subscribe((t) => emitted.push(t));
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(emitted[0]).toContain('https://bursa.app/r/abc');
  });

  it('emits opt-in changes from the checkbox', () => {
    const fixture = render();
    const emitted: boolean[] = [];
    fixture.componentInstance.optInChanged.subscribe((v) => emitted.push(v));
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="opt-in"]',
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(emitted).toEqual([true]);
  });
});
