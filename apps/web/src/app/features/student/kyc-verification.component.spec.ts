import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { VerificationCaseView } from '../../core/models';
import { KycVerificationComponent } from './kyc-verification.component';

function caseView(overrides: Partial<VerificationCaseView> = {}): VerificationCaseView {
  return {
    id: 'c1',
    subjectType: 'STUDENT',
    status: 'STARTED',
    reviewQueueStatus: 'NOT_REQUIRED',
    riskScore: 0,
    riskLevel: 'LOW',
    decisionNote: null,
    liveness: null,
    document: null,
    aml: null,
    createdAt: '2026-06-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('KycVerificationComponent', () => {
  let api: jest.Mocked<Pick<ApiService, 'kycStartCase' | 'kycLiveness' | 'kycDocument'>>;

  function create(): KycVerificationComponent {
    TestBed.configureTestingModule({
      imports: [KycVerificationComponent],
      providers: [{ provide: ApiService, useValue: api }],
    });
    return TestBed.createComponent(KycVerificationComponent).componentInstance;
  }

  beforeEach(() => {
    api = {
      kycStartCase: jest.fn().mockReturnValue(of(caseView())),
      kycLiveness: jest.fn().mockReturnValue(of(caseView({ status: 'LIVENESS_PASSED' }))),
      kycDocument: jest.fn().mockReturnValue(of(caseView({ status: 'VERIFIED' }))),
    } as unknown as typeof api;
    TestBed.resetTestingModule();
  });

  it('starts with no case and zero progress', () => {
    const c = create();
    expect(c.current()).toBeNull();
    expect(c.progressWidth()).toBe('0%');
    expect(c.statusLabel()).toBe('');
  });

  it('starts a case', () => {
    const c = create();
    c.start();
    expect(api.kycStartCase).toHaveBeenCalled();
    expect(c.current()?.status).toBe('STARTED');
    expect(c.livenessAvailable()).toBe(true);
    expect(c.documentAvailable()).toBe(false);
  });

  it('runs liveness then document to VERIFIED', () => {
    const c = create();
    c.start();
    c.runLiveness();
    expect(api.kycLiveness).toHaveBeenCalled();
    expect(c.documentAvailable()).toBe(true);
    c.runDocument();
    expect(c.current()?.status).toBe('VERIFIED');
    expect(c.terminal()).toBe(true);
    expect(c.progressWidth()).toBe('100%');
    expect(c.statusClass()).toContain('brand-green');
  });

  it('does nothing when running steps without a case', () => {
    const c = create();
    c.runLiveness();
    c.runDocument();
    expect(api.kycLiveness).not.toHaveBeenCalled();
    expect(api.kycDocument).not.toHaveBeenCalled();
  });

  it('surfaces an error and clears busy', () => {
    api.kycStartCase = jest.fn().mockReturnValue(throwError(() => new Error('boom')));
    const c = create();
    c.start();
    expect(c.error()).not.toBeNull();
    expect(c.busy()).toBe(false);
  });
});
