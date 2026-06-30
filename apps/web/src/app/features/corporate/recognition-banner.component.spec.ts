import { TestBed } from '@angular/core/testing';
import { CampaignRecognition } from '../../core/models';
import { RecognitionBannerComponent } from './recognition-banner.component';

describe('RecognitionBannerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecognitionBannerComponent],
    }).compileComponents();
  });

  function render(recognition: CampaignRecognition[]) {
    const fixture = TestBed.createComponent(RecognitionBannerComponent);
    fixture.componentRef.setInput('recognition', recognition);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a named scholarship and the supporting company', () => {
    const el = render([
      {
        companyName: 'Acme Capital',
        logoUrl: null,
        scholarshipName: 'The Acme Capital Scholarship',
      },
    ]);
    expect(el.textContent).toContain('Corporate supporters');
    expect(el.textContent).toContain('The Acme Capital Scholarship');
    expect(el.textContent).toContain('Supported by Acme Capital');
    // No logo => initials fallback
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('AC');
  });

  it('renders a company logo when present', () => {
    const el = render([
      { companyName: 'Globex', logoUrl: 'http://x/logo.png', scholarshipName: null },
    ]);
    const img = el.querySelector('img');
    expect(img?.getAttribute('src')).toBe('http://x/logo.png');
  });

  it('renders nothing when there is no recognition', () => {
    const el = render([]);
    expect(el.textContent).not.toContain('Corporate supporters');
  });

  it('falls back to a placeholder for an empty company name', () => {
    const fixture = TestBed.createComponent(RecognitionBannerComponent);
    expect(fixture.componentInstance.initials('')).toBe('?');
    expect(fixture.componentInstance.initials('Acme Capital')).toBe('AC');
  });
});
