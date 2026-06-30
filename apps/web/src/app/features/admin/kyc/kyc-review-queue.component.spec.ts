import { VerificationCaseView } from '../../../core/models';
import { KycReviewQueueComponent } from './kyc-review-queue.component';

function caseView(overrides: Partial<VerificationCaseView> = {}): VerificationCaseView {
  return {
    id: 'c1',
    subjectType: 'STUDENT',
    status: 'MANUAL_REVIEW',
    reviewQueueStatus: 'PENDING',
    riskScore: 30,
    riskLevel: 'MEDIUM',
    decisionNote: null,
    liveness: { provider: 'mock', confidence: 40, passed: false },
    document: null,
    aml: null,
    createdAt: '2026-06-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('KycReviewQueueComponent', () => {
  it('starts with empty notes', () => {
    const c = new KycReviewQueueComponent();
    expect(c.noteFor('c1')).toBe('');
  });

  it('records a typed note', () => {
    const c = new KycReviewQueueComponent();
    c.setNote('c1', {
      target: { value: 'looks fine' },
    } as unknown as Event);
    expect(c.noteFor('c1')).toBe('looks fine');
  });

  it('emits an approve decision with the typed note', () => {
    const c = new KycReviewQueueComponent();
    const events: unknown[] = [];
    c.decided.subscribe((e) => events.push(e));
    c.setNote('c1', { target: { value: 'ok' } } as unknown as Event);
    c.emit('c1', 'APPROVE');
    expect(events[0]).toEqual({ id: 'c1', decision: 'APPROVE', note: 'ok' });
  });

  it('falls back to a default note when blank', () => {
    const c = new KycReviewQueueComponent();
    const events: { note: string }[] = [];
    c.decided.subscribe((e) => events.push(e));
    c.emit('c1', 'REJECT');
    expect(events[0].note).toBe('Reviewed by operator');
  });

  it('derives the review reason from the case', () => {
    const c = new KycReviewQueueComponent();
    expect(c.reason(caseView())).toBe('Liveness check failed');
    expect(
      c.reason(
        caseView({
          liveness: { provider: 'mock', confidence: 90, passed: true },
          document: {
            provider: 'mock',
            extractedName: 'x',
            nameMatchScore: 10,
            matched: false,
            registrarConfirmed: false,
          },
        }),
      ),
    ).toBe('Document name mismatch');
  });

  it('exposes formatting helpers', () => {
    const c = new KycReviewQueueComponent();
    expect(c.statusLabel('VERIFIED')).toBe('Verified');
    expect(c.riskLabel('HIGH')).toBe('High');
    expect(c.barWidth(50)).toBe('50%');
    expect(c.amlLabel('HIT')).toBe('Watchlist hit');
    expect(c.riskClass('LOW')).toContain('mist');
  });
});
