// Pure builders for outbound school webhook envelopes (E8). No NestJS, no I/O.
// They shape a stable, PII-light event payload; the SchoolWebhookService persists
// and logs the result. Returns new immutable objects.

export type SchoolWebhookType =
  | 'student.reported'
  | 'campaign.approved'
  | 'payout.sent';

export interface SchoolWebhookEnvelope {
  readonly type: SchoolWebhookType;
  readonly schoolId: string;
  readonly occurredAt: string;
  readonly data: Readonly<Record<string, unknown>>;
}

const iso = (now: Date): string => now.toISOString();

export function buildStudentReportedEvent(
  schoolId: string,
  record: {
    id: string;
    studentName: string;
    admissionRef: string;
    status: string;
  },
  now: Date = new Date(),
): SchoolWebhookEnvelope {
  return {
    type: 'student.reported',
    schoolId,
    occurredAt: iso(now),
    data: {
      admissionRecordId: record.id,
      studentName: record.studentName,
      admissionRef: record.admissionRef,
      status: record.status,
    },
  };
}

export function buildCampaignApprovedEvent(
  schoolId: string,
  campaign: { id: string; title: string; goalCents: number },
  now: Date = new Date(),
): SchoolWebhookEnvelope {
  return {
    type: 'campaign.approved',
    schoolId,
    occurredAt: iso(now),
    data: {
      campaignId: campaign.id,
      title: campaign.title,
      goalCents: campaign.goalCents,
    },
  };
}

export function buildPayoutSentEvent(
  schoolId: string,
  payout: {
    id: string;
    campaignId: string;
    amountCents: number;
    reference: string;
  },
  now: Date = new Date(),
): SchoolWebhookEnvelope {
  return {
    type: 'payout.sent',
    schoolId,
    occurredAt: iso(now),
    data: {
      payoutId: payout.id,
      campaignId: payout.campaignId,
      amountCents: payout.amountCents,
      reference: payout.reference,
    },
  };
}
