import { TestBed } from '@angular/core/testing';
import { PrivacyPanelComponent } from './privacy-panel.component';

describe('PrivacyPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPanelComponent],
    }).compileComponents();
  });

  function render(inputs: { email?: string; anonymized?: boolean; busy?: boolean }) {
    const fixture = TestBed.createComponent(PrivacyPanelComponent);
    if (inputs.email !== undefined) fixture.componentRef.setInput('email', inputs.email);
    if (inputs.anonymized !== undefined)
      fixture.componentRef.setInput('anonymized', inputs.anonymized);
    if (inputs.busy !== undefined) fixture.componentRef.setInput('busy', inputs.busy);
    fixture.detectChanges();
    return fixture;
  }

  function buttonByText(el: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  }

  it('shows the masked email', () => {
    const el = render({ email: 'jane@example.com' }).nativeElement as HTMLElement;
    expect(el.textContent).toContain('j•••@example.com');
    expect(el.textContent).not.toContain('jane@example.com');
  });

  it('emits exportRequested when Export is clicked', () => {
    const fixture = render({ email: 'jane@example.com' });
    let exported = false;
    fixture.componentInstance.exportRequested.subscribe(() => (exported = true));
    buttonByText(fixture.nativeElement, 'Export my data').click();
    expect(exported).toBe(true);
  });

  it('requires a confirmation step before deleting', () => {
    const fixture = render({ email: 'jane@example.com' });
    const el = fixture.nativeElement as HTMLElement;
    let deleted = false;
    fixture.componentInstance.deleteRequested.subscribe(() => (deleted = true));

    expect(el.querySelector('[data-testid="confirm"]')).toBeNull();
    buttonByText(el, 'Delete my account').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="confirm"]')).not.toBeNull();
    expect(deleted).toBe(false);

    buttonByText(el, 'Yes, delete my account').click();
    expect(deleted).toBe(true);
  });

  it('can cancel the delete confirmation', () => {
    const fixture = render({ email: 'jane@example.com' });
    const el = fixture.nativeElement as HTMLElement;
    buttonByText(el, 'Delete my account').click();
    fixture.detectChanges();
    buttonByText(el, 'Cancel').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="confirm"]')).toBeNull();
  });

  it('shows the anonymised state and hides the actions', () => {
    const el = render({ email: 'jane@example.com', anonymized: true }).nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="anonymized"]')).not.toBeNull();
    expect(buttonByText(el, 'Export my data')).toBeUndefined();
  });
});
