import { TestBed } from '@angular/core/testing';
import { CampaignTrust } from '../../core/models';
import { TrustPanelComponent } from './trust-panel.component';

describe('TrustPanelComponent', () => {
  const trust: CampaignTrust = {
    identityChecked: true,
    admissionVerified: true,
    schoolConfirmed: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustPanelComponent],
    }).compileComponents();
  });

  function render(value: CampaignTrust): HTMLElement {
    const fixture = TestBed.createComponent(TrustPanelComponent);
    fixture.componentRef.setInput('trust', value);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('states that Bursa pays the school directly, never the student', () => {
    const el = render(trust);
    expect(el.textContent).toContain('Bursa pays the school directly, never the student');
  });

  it('renders the fund-flow explainer Donor -> Bursa (nonprofit) -> School', () => {
    const el = render(trust);
    const text = el.textContent ?? '';
    expect(text).toContain('Donor');
    expect(text).toContain('Bursa');
    expect(text).toContain('nonprofit');
    expect(text).toContain('School');
  });

  it('embeds the reusable trust badges for the given signals', () => {
    const el = render(trust);
    expect(el.querySelector('app-trust-badges')).not.toBeNull();
    expect(el.textContent).toContain('Admission verified');
  });
});
