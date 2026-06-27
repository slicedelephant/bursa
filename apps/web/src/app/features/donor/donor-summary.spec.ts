import { DonorSummary } from '../../core/models';
import { recurringLabel, repeatLabel, supportedLabel } from './donor-summary';

const summary = (over: Partial<DonorSummary> = {}): DonorSummary => ({
  totalDonatedCents: 0,
  donationCount: 0,
  campaignsSupported: 0,
  repeatDonor: false,
  activeRecurringCount: 0,
  ...over,
});

describe('repeatLabel', () => {
  it('welcomes a donor with no donations', () => {
    expect(repeatLabel(summary())).toBe('Welcome');
  });
  it('labels a single donor as first-time', () => {
    expect(repeatLabel(summary({ donationCount: 1 }))).toBe('First-time supporter');
  });
  it('labels a repeat donor', () => {
    expect(repeatLabel(summary({ donationCount: 3, repeatDonor: true }))).toBe('Repeat supporter');
  });
});

describe('supportedLabel', () => {
  it('handles zero', () => {
    expect(supportedLabel(summary())).toBe('No students supported yet');
  });
  it('uses singular for one', () => {
    expect(supportedLabel(summary({ campaignsSupported: 1 }))).toBe('Supporting 1 student');
  });
  it('uses plural for many', () => {
    expect(supportedLabel(summary({ campaignsSupported: 4 }))).toBe('Supporting 4 students');
  });
});

describe('recurringLabel', () => {
  it('handles none', () => {
    expect(recurringLabel(0)).toBe('No active monthly gifts');
    expect(recurringLabel(-1)).toBe('No active monthly gifts');
  });
  it('uses singular and plural', () => {
    expect(recurringLabel(1)).toBe('1 active monthly gift');
    expect(recurringLabel(2)).toBe('2 active monthly gifts');
  });
});
