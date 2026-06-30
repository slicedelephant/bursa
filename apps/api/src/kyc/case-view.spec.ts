import {
  AmlDecision,
  ReviewQueueStatus,
  RiskLevel,
  VerificationCaseStatus,
  VerificationSubject,
} from '@prisma/client';
import { CaseWithSteps, toCaseView } from './case-view';

function baseCase(overrides: Partial<CaseWithSteps> = {}): CaseWithSteps {
  return {
    id: 'c1',
    subjectType: VerificationSubject.STUDENT,
    subjectUserId: 'u1',
    admissionRecordId: null,
    status: VerificationCaseStatus.STARTED,
    reviewQueueStatus: ReviewQueueStatus.NOT_REQUIRED,
    riskScore: 0,
    riskLevel: RiskLevel.LOW,
    decisionNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-30T10:00:00.000Z'),
    updatedAt: new Date('2026-06-30T10:00:00.000Z'),
    ...overrides,
  } as CaseWithSteps;
}

describe('case-view', () => {
  it('maps a bare case with null step children', () => {
    const view = toCaseView(baseCase());
    expect(view.id).toBe('c1');
    expect(view.liveness).toBeNull();
    expect(view.document).toBeNull();
    expect(view.aml).toBeNull();
    expect(view.createdAt).toBe('2026-06-30T10:00:00.000Z');
  });

  it('maps the liveness child', () => {
    const view = toCaseView(
      baseCase({
        liveness: {
          id: 'l1',
          caseId: 'c1',
          provider: 'mock',
          confidence: 92,
          passed: true,
          reference: 'ref',
          createdAt: new Date(),
        },
      }),
    );
    expect(view.liveness).toEqual({
      provider: 'mock',
      confidence: 92,
      passed: true,
    });
  });

  it('maps the document child', () => {
    const view = toCaseView(
      baseCase({
        document: {
          id: 'd1',
          caseId: 'c1',
          provider: 'mock',
          extractedName: 'Amara Okonkwo',
          extractedSchool: 'INSEAD',
          extractedDegree: 'MBA',
          nameMatchScore: 100,
          matched: true,
          registrarConfirmed: true,
          reference: 'ref',
          createdAt: new Date(),
        },
      }),
    );
    expect(view.document?.matched).toBe(true);
    expect(view.document?.registrarConfirmed).toBe(true);
  });

  it('maps the aml child and coerces reasons to a string array', () => {
    const view = toCaseView(
      baseCase({
        subjectType: VerificationSubject.SPONSOR,
        aml: {
          id: 'a1',
          caseId: 'c1',
          provider: 'mock',
          amountCents: 600000,
          country: 'RU',
          decision: AmlDecision.BLOCKED,
          reasons: ['Contribution from a sanctioned country'],
          reference: 'ref',
          createdAt: new Date(),
        },
      }),
    );
    expect(view.aml?.decision).toBe(AmlDecision.BLOCKED);
    expect(view.aml?.reasons).toEqual([
      'Contribution from a sanctioned country',
    ]);
  });

  it('defaults non-array reasons to []', () => {
    const view = toCaseView(
      baseCase({
        aml: {
          id: 'a1',
          caseId: 'c1',
          provider: 'mock',
          amountCents: 600000,
          country: 'DE',
          decision: AmlDecision.CLEAR,
          reasons: null as unknown as object,
          reference: 'ref',
          createdAt: new Date(),
        },
      }),
    );
    expect(view.aml?.reasons).toEqual([]);
  });
});
