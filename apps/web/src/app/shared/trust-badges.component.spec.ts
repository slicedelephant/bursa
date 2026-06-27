import { TestBed } from '@angular/core/testing';
import { CampaignTrust } from '../core/models';
import { TrustBadgesComponent } from './trust-badges.component';

describe('TrustBadgesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustBadgesComponent],
    }).compileComponents();
  });

  function render(trust: CampaignTrust): HTMLElement {
    const fixture = TestBed.createComponent(TrustBadgesComponent);
    fixture.componentRef.setInput('trust', trust);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders all three badges when every signal is true', () => {
    const el = render({
      identityChecked: true,
      admissionVerified: true,
      schoolConfirmed: true,
    });
    const items = el.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(el.textContent).toContain('Identity checked');
    expect(el.textContent).toContain('Admission verified');
    expect(el.textContent).toContain('School confirmed');
  });

  it('renders only the active badges', () => {
    const el = render({
      identityChecked: false,
      admissionVerified: true,
      schoolConfirmed: false,
    });
    const items = el.querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(el.textContent).toContain('Admission verified');
    expect(el.textContent).not.toContain('Identity checked');
    expect(el.textContent).not.toContain('School confirmed');
  });

  it('renders no list when no signal is set', () => {
    const el = render({
      identityChecked: false,
      admissionVerified: false,
      schoolConfirmed: false,
    });
    expect(el.querySelector('ul')).toBeNull();
    expect(el.querySelectorAll('li').length).toBe(0);
  });

  it('exposes an explanatory tooltip per badge', () => {
    const el = render({
      identityChecked: true,
      admissionVerified: true,
      schoolConfirmed: true,
    });
    const items = Array.from(el.querySelectorAll('li'));
    for (const item of items) {
      const tooltip = item.getAttribute('title');
      expect(tooltip).toBeTruthy();
      expect((tooltip ?? '').length).toBeGreaterThan(10);
    }
  });
});
