// Pure presentation helpers for the moderation queue. No Angular, no I/O.

import { ModerationStatus, TrustDashboardData } from '../../../core/models';

/** Human label for a moderation status. */
export function moderationStatusLabel(status: ModerationStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'ESCALATED':
      return 'Escalated';
    default:
      return status;
  }
}

/** Tailwind chip classes for a moderation status. */
export function moderationStatusClass(status: ModerationStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'REJECTED':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    case 'ESCALATED':
      return 'bg-amber-100 text-amber-800 ring-amber-300';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** Humanises a machine reason code, e.g. "suspicious_keyword:bitcoin". */
export function reasonLabel(reason: string): string {
  const [code, detail] = reason.split(':');
  const words = code
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
  return detail ? `${words}: ${detail}` : words;
}

/** Maps a list of reason codes to human labels. */
export function reasonLabels(reasons: readonly string[]): string[] {
  return reasons.map(reasonLabel);
}

/** One-line backlog summary for the dashboard header. */
export function backlogSummary(d: TrustDashboardData): string {
  return `${d.moderation.openCases} open · ${d.moderation.escalated} escalated`;
}
