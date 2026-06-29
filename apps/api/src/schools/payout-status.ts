// Pure derivation of a student-level payout status for the school dashboard (E8).
// Maps the campaign lifecycle + optional payout row onto a small, display-ready
// status. No NestJS, no Prisma; returns new values, never mutates.

import { CampaignStatus, PayoutStatus } from '@prisma/client';

export type StudentPayoutStatus =
  | 'NONE'
  | 'AWAITING_FUNDING'
  | 'READY'
  | 'SENT'
  | 'CONFIRMED';

export interface CampaignPayoutInput {
  readonly status: CampaignStatus;
  readonly payout?: { readonly status: PayoutStatus } | null;
}

/**
 * Money always flows to the school, never the student (Constitution II): this
 * status reflects the school-bound disbursement, derived from the payout row
 * when present, otherwise inferred from the campaign lifecycle.
 */
export function deriveStudentPayoutStatus(
  input: CampaignPayoutInput,
): StudentPayoutStatus {
  if (input.payout) {
    switch (input.payout.status) {
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'SENT':
        return 'SENT';
      default:
        return 'READY';
    }
  }
  switch (input.status) {
    case 'DISBURSED':
      return 'SENT';
    case 'FUNDED':
      return 'READY';
    case 'LIVE':
    case 'PENDING_VERIFICATION':
    case 'DRAFT':
      return 'AWAITING_FUNDING';
    default:
      return 'NONE';
  }
}

const LABELS: Record<StudentPayoutStatus, string> = {
  NONE: 'No payout',
  AWAITING_FUNDING: 'Awaiting funding',
  READY: 'Ready to disburse',
  SENT: 'Payout sent',
  CONFIRMED: 'Received by school',
};

export function payoutStatusLabel(status: StudentPayoutStatus): string {
  return LABELS[status];
}

/** True once funds are on their way to (or received by) the school. */
export function isPaidOut(status: StudentPayoutStatus): boolean {
  return status === 'SENT' || status === 'CONFIRMED';
}
