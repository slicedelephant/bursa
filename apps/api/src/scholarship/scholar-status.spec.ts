import {
  InvalidScholarTransitionError,
  isTerminalScholarStatus,
  nextScholarStatus,
} from './scholar-status';

const NOW = new Date('2026-09-01T00:00:00.000Z');

describe('nextScholarStatus', () => {
  it('advances AWARDED -> ENROLLED and stamps enrolledAt', () => {
    const res = nextScholarStatus('AWARDED', 'enroll', NOW);
    expect(res).toEqual({
      status: 'ENROLLED',
      milestoneField: 'enrolledAt',
      at: NOW,
    });
  });

  it('advances ENROLLED -> GRADUATED', () => {
    expect(nextScholarStatus('ENROLLED', 'graduate', NOW).status).toBe(
      'GRADUATED',
    );
  });

  it('advances GRADUATED -> WORKING', () => {
    expect(nextScholarStatus('GRADUATED', 'employ', NOW).status).toBe(
      'WORKING',
    );
  });

  it('allows withdraw from any non-terminal state', () => {
    expect(nextScholarStatus('ENROLLED', 'withdraw', NOW).status).toBe(
      'WITHDRAWN',
    );
    expect(nextScholarStatus('WORKING', 'withdraw', NOW).milestoneField).toBe(
      'withdrawnAt',
    );
  });

  it('rejects skipping a stage', () => {
    expect(() => nextScholarStatus('AWARDED', 'graduate', NOW)).toThrow(
      InvalidScholarTransitionError,
    );
  });

  it('rejects any transition out of a terminal state', () => {
    expect(() => nextScholarStatus('WITHDRAWN', 'enroll', NOW)).toThrow(
      InvalidScholarTransitionError,
    );
  });

  it('uses the injected now for the milestone timestamp', () => {
    const other = new Date('2027-01-01T00:00:00.000Z');
    expect(nextScholarStatus('AWARDED', 'enroll', other).at).toBe(other);
  });
});

describe('isTerminalScholarStatus', () => {
  it('treats WITHDRAWN as terminal and others as not', () => {
    expect(isTerminalScholarStatus('WITHDRAWN')).toBe(true);
    expect(isTerminalScholarStatus('WORKING')).toBe(false);
    expect(isTerminalScholarStatus('AWARDED')).toBe(false);
  });
});
