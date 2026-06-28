import { TestBed } from '@angular/core/testing';
import { ConsentBannerComponent } from './consent-banner.component';

describe('ConsentBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsentBannerComponent],
    }).compileComponents();
  });

  function render(visible: boolean) {
    const fixture = TestBed.createComponent(ConsentBannerComponent);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
    return fixture;
  }

  it('is hidden when not visible', () => {
    const el = render(false).nativeElement as HTMLElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the consent text when visible', () => {
    const el = render(true).nativeElement as HTMLElement;
    expect(el.textContent).toContain('anonymous analytics');
  });

  it('emits accepted and declined', () => {
    const fixture = render(true);
    const events: string[] = [];
    fixture.componentInstance.accepted.subscribe(() => events.push('accept'));
    fixture.componentInstance.declined.subscribe(() => events.push('decline'));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click(); // Decline
    (buttons[1] as HTMLButtonElement).click(); // Accept
    expect(events).toEqual(['decline', 'accept']);
  });
});
