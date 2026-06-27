import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CorporateSponsorshipResult } from '../../core/models';
import { CorporateSponsorBoxComponent } from './corporate-sponsor-box.component';

const result = (over: Partial<CorporateSponsorshipResult> = {}): CorporateSponsorshipResult => ({
  donation: { id: 'd1', amountCents: 60_000, status: 'SUCCEEDED' },
  campaign: {
    id: 'c1',
    status: 'FUNDED',
    goalCents: 100_000,
    raisedCents: 100_000,
    tipsCents: 0,
    currency: 'EUR',
    percent: 100,
  },
  sponsorship: {
    id: 'sp1',
    tier: 'FULL',
    fullTuition: true,
    scholarshipName: 'The Acme Scholarship',
    logoRecognition: true,
    recognitionKind: 'NAMED',
  },
  invoice: {
    invoiceNo: 'BURSA-INV-2026-SP1',
    documentType: 'SPONSORING',
    netCents: 60_000,
    vatCents: 11_400,
    grossCents: 71_400,
    currency: 'EUR',
    status: 'PAID',
  },
  ...over,
});

describe('CorporateSponsorBoxComponent', () => {
  let api: { corporateSponsor: jest.Mock };

  beforeEach(async () => {
    api = { corporateSponsor: jest.fn().mockReturnValue(of(result())) };
    await TestBed.configureTestingModule({
      imports: [CorporateSponsorBoxComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();
  });

  function render(goal = 100_000, raised = 40_000) {
    const fixture = TestBed.createComponent(CorporateSponsorBoxComponent);
    fixture.componentRef.setInput('campaignId', 'c1');
    fixture.componentRef.setInput('goalCents', goal);
    fixture.componentRef.setInput('raisedCents', raised);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the full-tuition CTA with the exact remaining gap and tiers', () => {
    const el = render().nativeElement as HTMLElement;
    expect(el.textContent).toContain('Close the gap');
    expect(el.textContent).toContain('€600'); // gap = 60_000 cents = €600
    expect(el.textContent).toContain('One semester');
    expect(el.textContent).toContain('Full tuition');
    expect(el.textContent).toContain('Bursa holds no funds');
  });

  it('defaults to the full gap and sponsors via card, showing the invoice', () => {
    const fixture = render();
    const emitted: CorporateSponsorshipResult[] = [];
    fixture.componentInstance.sponsored.subscribe((r) => emitted.push(r));

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(api.corporateSponsor).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ tier: 'FULL', method: 'CARD' }),
    );
    expect(emitted).toHaveLength(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Tuition fully funded');
    expect(el.textContent).toContain('BURSA-INV-2026-SP1');
    expect(el.textContent).toContain('19% VAT');
  });

  it('sends recognition + B2B fields and a custom amount', () => {
    const fixture = render();
    const c = fixture.componentInstance;
    c.tierModel = 'CUSTOM';
    c.customEur = 250;
    c.scholarshipName = 'The Globex Scholarship';
    c.logoRecognition = true;
    c.impactReportOptIn = true;
    c.vatId = 'DE123456789';
    c.poNumber = 'PO-1';
    fixture.detectChanges();

    expect(c.amountCents()).toBe(25_000);
    c.submit();

    expect(api.corporateSponsor).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        tier: 'CUSTOM',
        amountCents: 25_000,
        scholarshipName: 'The Globex Scholarship',
        logoRecognition: true,
        impactReportOptIn: true,
        vatId: 'DE123456789',
        poNumber: 'PO-1',
      }),
    );
  });

  it('blocks submit when the gap is closed', () => {
    const fixture = render(100_000, 100_000);
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    expect(fixture.componentInstance.amountCents()).toBe(0);
  });

  it('surfaces a server error', () => {
    api.corporateSponsor.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Card declined' } } })),
    );
    const fixture = render();
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Card declined');
  });

  it('selectFull picks the full tier and isFull reflects the gap', () => {
    const fixture = render();
    const c = fixture.componentInstance;
    c.tierModel = 'SEMESTER';
    c.selectFull();
    expect(c.tierModel).toBe('FULL');
    expect(c.isFull()).toBe(true);
  });

  it('reset clears the success state and the form fields', () => {
    const fixture = render();
    const c = fixture.componentInstance;
    c.submit(); // success via mocked api
    fixture.detectChanges();
    expect(c.result()).not.toBeNull();

    c.scholarshipName = 'X';
    c.logoRecognition = true;
    c.vatId = 'DE1';
    c.reset();
    expect(c.result()).toBeNull();
    expect(c.scholarshipName).toBe('');
    expect(c.logoRecognition).toBe(false);
    expect(c.vatId).toBe('');
    expect(c.tierModel).toBe('FULL');
  });
});
