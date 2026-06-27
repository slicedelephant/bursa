import { TestBed } from '@angular/core/testing';
import { PasswordStrengthMeterComponent } from './password-strength-meter.component';

describe('PasswordStrengthMeterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordStrengthMeterComponent],
    }).compileComponents();
  });

  function render(password: string): HTMLElement {
    const fixture = TestBed.createComponent(PasswordStrengthMeterComponent);
    fixture.componentRef.setInput('password', password);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing when the password is empty', () => {
    const el = render('');
    expect(el.querySelector('[data-testid="meter"]')).toBeNull();
  });

  it('shows a weak label and issues for a poor password', () => {
    const el = render('abc');
    expect(el.textContent).toContain('Password strength');
    expect(el.textContent?.toLowerCase()).toContain('weak');
    expect(el.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('shows a strong label and no issues for a good password', () => {
    const el = render('Tr0ubadour-Xy!');
    expect(el.textContent?.toLowerCase()).toMatch(/good|strong/);
    expect(el.querySelectorAll('li').length).toBe(0);
  });

  it('fills the meter bar width by score', () => {
    const el = render('Tr0ubadour-Xy!');
    const bar = el.querySelector('.h-1\\.5.rounded-full.transition-all') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });
});
