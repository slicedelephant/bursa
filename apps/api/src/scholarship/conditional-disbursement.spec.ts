import { decideConditionalRelease } from './conditional-disbursement';

describe('decideConditionalRelease', () => {
  it('releases when gpa meets the threshold', () => {
    const res = decideConditionalRelease({ gpa: 3.7, threshold: 3.5, alreadyReleased: false });
    expect(res).toEqual({ decision: 'RELEASE', reason: 'GPA_MET' });
  });

  it('releases on an exact threshold match', () => {
    const res = decideConditionalRelease({ gpa: 3.5, threshold: 3.5, alreadyReleased: false });
    expect(res.decision).toBe('RELEASE');
  });

  it('holds when gpa is below the threshold', () => {
    const res = decideConditionalRelease({ gpa: 3.0, threshold: 3.5, alreadyReleased: false });
    expect(res).toEqual({ decision: 'HELD', reason: 'GPA_BELOW_THRESHOLD' });
  });

  it('holds when no threshold is configured', () => {
    const res = decideConditionalRelease({ gpa: 4.0, threshold: null, alreadyReleased: false });
    expect(res.reason).toBe('NO_THRESHOLD_CONFIGURED');
  });

  it('holds when gpa is not recorded', () => {
    const res = decideConditionalRelease({ gpa: null, threshold: 3.5, alreadyReleased: false });
    expect(res.reason).toBe('GPA_NOT_RECORDED');
  });

  it('holds when the tranche was already released', () => {
    const res = decideConditionalRelease({ gpa: 4.0, threshold: 3.5, alreadyReleased: true });
    expect(res.reason).toBe('ALREADY_RELEASED');
  });
});
