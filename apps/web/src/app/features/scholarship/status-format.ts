import { ApplicationStatus, ScholarStatus } from '../../core/models';

/**
 * E19 — pure presentation helpers for scholar + application status. No I/O;
 * returns new values, never mutates inputs.
 */

export function scholarStatusLabel(status: ScholarStatus): string {
  switch (status) {
    case 'AWARDED':
      return 'Awarded';
    case 'ENROLLED':
      return 'Enrolled';
    case 'GRADUATED':
      return 'Graduated';
    case 'WORKING':
      return 'Working';
    case 'WITHDRAWN':
      return 'Withdrawn';
    default:
      return status;
  }
}

/** Tailwind badge classes per scholar status. */
export function scholarStatusBadge(status: ScholarStatus): string {
  switch (status) {
    case 'GRADUATED':
    case 'WORKING':
      return 'bg-brand-green/10 text-brand-green';
    case 'WITHDRAWN':
      return 'bg-brand-orange/10 text-brand-orange';
    default:
      return 'bg-brand-blue/10 text-brand-blue';
  }
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'UNDER_REVIEW':
      return 'Under review';
    case 'SHORTLISTED':
      return 'Shortlisted';
    case 'AWARDED':
      return 'Awarded';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

/** The SRM event that advances a scholar from the current status, or null if terminal. */
export function nextScholarEvent(status: ScholarStatus): {
  event: 'enroll' | 'graduate' | 'employ';
  label: string;
} | null {
  switch (status) {
    case 'AWARDED':
      return { event: 'enroll', label: 'Mark enrolled' };
    case 'ENROLLED':
      return { event: 'graduate', label: 'Mark graduated' };
    case 'GRADUATED':
      return { event: 'employ', label: 'Mark working' };
    default:
      return null;
  }
}
