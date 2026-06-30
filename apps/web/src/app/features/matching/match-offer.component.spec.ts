import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { MatchClaimResult, MatchOffer } from '../../core/models';
import { MatchOfferComponent } from './match-offer.component';

const eligibleOffer: MatchOffer = {
  eligible: true,
  employerName: 'SAP',
  matchCents: 10_000,
  annualCapCents: 500_000,
  remainingAnnualCents: 490_000,
  integrationLevel: 'PORTAL',
  capped: false,
  labels: {
    headline: 'SAP matches your gift with €100',
    cta: 'Claim €100 employer match',
    balance: '€4900 match still available this year',
  },
};

const ineligibleOffer: MatchOffer = {
  eligible: false,
  labels: { headline: '', cta: '', balance: '' },
};

const claimResult: MatchClaimResult = {
  id: 'claim_1',
  status: 'CLAIMED',
  statusLabel: 'Claimed',
  employerName: 'SAP',
  matchCents: 10_000,
  campaignId: 'camp_1',
  applyUrl: 'https://m.sap.example/apply?amount=100',
  hasPdf: false,
  remainingAnnualCents: 480_000,
  labels: { headline: 'h', status: 'Claimed' },
};

describe('MatchOfferComponent', () => {
  function setup(api: Partial<ApiService>) {
    TestBed.configureTestingModule({
      imports: [MatchOfferComponent],
      providers: [{ provide: ApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(MatchOfferComponent);
    fixture.componentRef.setInput('campaignId', 'camp_1');
    fixture.componentRef.setInput('donationId', 'don_1');
    fixture.componentRef.setInput('donationCents', 10_000);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the check form initially', () => {
    const fixture = setup({ matchOffer: jest.fn() });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Double your impact');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Check my employer');
  });

  it('surfaces an eligible offer and a claim CTA', () => {
    const fixture = setup({ matchOffer: jest.fn().mockReturnValue(of(eligibleOffer)) });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SAP matches your gift with €100');
    expect(text).toContain('Claim €100 employer match');
  });

  it('shows a friendly message when no program is found', () => {
    const fixture = setup({ matchOffer: jest.fn().mockReturnValue(of(ineligibleOffer)) });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@example.org';
    cmp.check();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "couldn't find a matching program",
    );
  });

  it('claims the match and shows the apply link', () => {
    const fixture = setup({
      matchOffer: jest.fn().mockReturnValue(of(eligibleOffer)),
      matchClaim: jest.fn().mockReturnValue(of(claimResult)),
    });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    fixture.detectChanges();
    cmp.claim();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Match claimed');
    expect(text).toContain("Open your employer's matching form");
  });

  it('shows a PDF download link for a manual-level claim', () => {
    const pdfClaim: MatchClaimResult = {
      ...claimResult,
      applyUrl: undefined,
      hasPdf: true,
      documentUrl: '/api/matching/me/claims/claim_1/document',
    };
    const fixture = setup({
      matchOffer: jest.fn().mockReturnValue(of({ ...eligibleOffer, integrationLevel: 'MANUAL' })),
      matchClaim: jest.fn().mockReturnValue(of(pdfClaim)),
    });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@siemens.com';
    cmp.check();
    fixture.detectChanges();
    cmp.claim();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Download your claim PDF');
  });

  it('surfaces a check error', () => {
    const fixture = setup({
      matchOffer: jest
        .fn()
        .mockReturnValue(throwError(() => ({ error: { error: { message: 'nope' } } }))),
    });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('nope');
  });

  it('surfaces a claim error', () => {
    const fixture = setup({
      matchOffer: jest.fn().mockReturnValue(of(eligibleOffer)),
      matchClaim: jest
        .fn()
        .mockReturnValue(throwError(() => ({ error: { error: { message: 'boom' } } }))),
    });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    cmp.claim();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('boom');
  });

  it('guards check() until a work email is entered', () => {
    const matchOffer = jest.fn();
    const fixture = setup({ matchOffer });
    fixture.componentInstance.check();
    expect(matchOffer).not.toHaveBeenCalled();
  });

  it('exposes the right CTA hint per integration level', () => {
    const fixture = setup({ matchOffer: jest.fn().mockReturnValue(of(eligibleOffer)) });
    const cmp = fixture.componentInstance;
    expect(cmp.ctaHint()).toContain('pre-filled application'); // no offer yet → default
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    expect(cmp.ctaHint()).toContain('pre-filled application');
    cmp.offer.set({ ...eligibleOffer, integrationLevel: 'MANUAL' });
    expect(cmp.ctaHint()).toContain('claim PDF');
  });

  it('falls back to a default message when the error has no body', () => {
    const fixture = setup({
      matchOffer: jest.fn().mockReturnValue(of(eligibleOffer)),
      matchClaim: jest.fn().mockReturnValue(throwError(() => ({}))),
    });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    cmp.claim();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not claim your match',
    );
  });

  it('falls back to a default message when the check error has no body', () => {
    const fixture = setup({ matchOffer: jest.fn().mockReturnValue(throwError(() => ({}))) });
    const cmp = fixture.componentInstance;
    cmp.workEmail = 'jane@sap.com';
    cmp.check();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Could not check your employer',
    );
  });
});
