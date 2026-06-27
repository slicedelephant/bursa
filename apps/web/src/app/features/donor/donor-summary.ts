import { DonorSummary } from '../../core/models';

/** Pure labels for the donor account header. No I/O; returns new strings. */

export function repeatLabel(summary: DonorSummary): string {
  if (summary.donationCount === 0) return 'Welcome';
  return summary.repeatDonor ? 'Repeat supporter' : 'First-time supporter';
}

export function supportedLabel(summary: DonorSummary): string {
  const n = summary.campaignsSupported;
  if (n === 0) return 'No students supported yet';
  return `Supporting ${n} student${n === 1 ? '' : 's'}`;
}

export function recurringLabel(count: number): string {
  if (count <= 0) return 'No active monthly gifts';
  return `${count} active monthly gift${count === 1 ? '' : 's'}`;
}
