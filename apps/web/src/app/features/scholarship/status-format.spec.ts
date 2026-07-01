import {
  applicationStatusLabel,
  nextScholarEvent,
  scholarStatusBadge,
  scholarStatusLabel,
} from './status-format';

describe('scholarStatusLabel', () => {
  it('labels each scholar status', () => {
    expect(scholarStatusLabel('AWARDED')).toBe('Awarded');
    expect(scholarStatusLabel('ENROLLED')).toBe('Enrolled');
    expect(scholarStatusLabel('GRADUATED')).toBe('Graduated');
    expect(scholarStatusLabel('WORKING')).toBe('Working');
    expect(scholarStatusLabel('WITHDRAWN')).toBe('Withdrawn');
  });

  it('falls back to the raw value', () => {
    expect(scholarStatusLabel('X' as never)).toBe('X');
  });
});

describe('scholarStatusBadge', () => {
  it('greens graduated + working', () => {
    expect(scholarStatusBadge('GRADUATED')).toContain('brand-green');
    expect(scholarStatusBadge('WORKING')).toContain('brand-green');
  });

  it('oranges withdrawn', () => {
    expect(scholarStatusBadge('WITHDRAWN')).toContain('brand-orange');
  });

  it('blues the in-progress states', () => {
    expect(scholarStatusBadge('AWARDED')).toContain('brand-blue');
    expect(scholarStatusBadge('ENROLLED')).toContain('brand-blue');
  });
});

describe('applicationStatusLabel', () => {
  it('labels each application status', () => {
    expect(applicationStatusLabel('SUBMITTED')).toBe('Submitted');
    expect(applicationStatusLabel('UNDER_REVIEW')).toBe('Under review');
    expect(applicationStatusLabel('SHORTLISTED')).toBe('Shortlisted');
    expect(applicationStatusLabel('AWARDED')).toBe('Awarded');
    expect(applicationStatusLabel('REJECTED')).toBe('Rejected');
  });

  it('falls back to the raw value', () => {
    expect(applicationStatusLabel('X' as never)).toBe('X');
  });
});

describe('nextScholarEvent', () => {
  it('advances through the lifecycle', () => {
    expect(nextScholarEvent('AWARDED')?.event).toBe('enroll');
    expect(nextScholarEvent('ENROLLED')?.event).toBe('graduate');
    expect(nextScholarEvent('GRADUATED')?.event).toBe('employ');
  });

  it('returns null for terminal or working states', () => {
    expect(nextScholarEvent('WORKING')).toBeNull();
    expect(nextScholarEvent('WITHDRAWN')).toBeNull();
  });
});
