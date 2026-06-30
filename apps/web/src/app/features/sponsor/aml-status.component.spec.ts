import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { VerificationCaseView } from '../../core/models';
import { AmlStatusComponent } from './aml-status.component';

function view(overrides: Partial<VerificationCaseView> = {}): VerificationCaseView {
  return {
    id: 'c1',
    subjectType: 'SPONSOR',
    status: 'VERIFIED',
    reviewQueueStatus: 'NOT_REQUIRED',
    riskScore: 0,
    riskLevel: 'LOW',
    decisionNote: null,
    liveness: null,
    document: null,
    aml: {
      provider: 'mock',
      amountCents: 600000,
      country: 'DE',
      decision: 'CLEAR',
      reasons: [],
    },
    createdAt: '2026-06-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('AmlStatusComponent', () => {
  let api: { kycScreenAml: jest.Mock };

  function create(): AmlStatusComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AmlStatusComponent],
      providers: [{ provide: ApiService, useValue: api }],
    });
    return TestBed.createComponent(AmlStatusComponent).componentInstance;
  }

  beforeEach(() => {
    api = { kycScreenAml: jest.fn().mockReturnValue(of(view())) };
  });

  it('runs a clear screening', () => {
    const c = create();
    c.runDemo();
    expect(api.kycScreenAml).toHaveBeenCalled();
    const r = c.result();
    expect(r).not.toBeNull();
    expect(c.statusLabel(r!)).toBe('Cleared');
    expect(c.statusClass(r!)).toContain('brand-green');
    expect(c.nextStep(r!)).toMatch(/passed/i);
  });

  it('handles a HIT result', () => {
    api.kycScreenAml.mockReturnValue(
      of(
        view({
          status: 'MANUAL_REVIEW',
          aml: {
            provider: 'mock',
            amountCents: 600000,
            country: 'NG',
            decision: 'HIT',
            reasons: ['Elevated-risk'],
          },
        }),
      ),
    );
    const c = create();
    c.runDemo();
    expect(c.statusLabel(c.result()!)).toBe('Flagged for review');
  });

  it('surfaces an error when blocked', () => {
    api.kycScreenAml.mockReturnValue(throwError(() => new Error('blocked')));
    const c = create();
    c.runDemo();
    expect(c.error()).not.toBeNull();
    expect(c.busy()).toBe(false);
  });

  it('defaults to CLEAR labels when aml is missing', () => {
    const c = create();
    const v = view({ aml: null });
    expect(c.statusLabel(v)).toBe('Cleared');
    expect(c.statusClass(v)).toContain('brand-green');
  });
});
