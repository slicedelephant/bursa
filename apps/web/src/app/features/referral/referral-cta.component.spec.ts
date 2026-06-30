import { TestBed } from '@angular/core/testing';
import { ReferralCtaComponent } from './referral-cta.component';

describe('ReferralCtaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralCtaComponent],
    }).compileComponents();
  });

  function render(shareUrl: string, heading?: string) {
    const fixture = TestBed.createComponent(ReferralCtaComponent);
    fixture.componentRef.setInput('shareUrl', shareUrl);
    if (heading) fixture.componentRef.setInput('heading', heading);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the shortened link and the default heading', () => {
    const el = render('https://bursa.app/r/abc').nativeElement as HTMLElement;
    expect(el.textContent).toContain('bursa.app/r/abc');
    expect(el.textContent).toContain('invite a friend');
    expect(el.textContent).toContain('supporter badge');
  });

  it('honours a custom heading', () => {
    const el = render('https://bursa.app/r/abc', 'Pass it on').nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pass it on');
  });

  it('emits share when the button is clicked', () => {
    const fixture = render('https://bursa.app/r/abc');
    let fired = false;
    fixture.componentInstance.share.subscribe(() => (fired = true));
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="cta-share"]',
      ) as HTMLButtonElement
    ).click();
    expect(fired).toBe(true);
  });
});
