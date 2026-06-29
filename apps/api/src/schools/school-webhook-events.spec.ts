import {
  buildCampaignApprovedEvent,
  buildPayoutSentEvent,
  buildStudentReportedEvent,
} from './school-webhook-events';

const now = new Date('2026-06-29T10:00:00.000Z');

describe('school-webhook-events', () => {
  it('builds a student.reported envelope', () => {
    const event = buildStudentReportedEvent(
      'school1',
      { id: 'rec1', studentName: 'Amara', admissionRef: 'ADM-1', status: 'VERIFIED' },
      now,
    );
    expect(event).toEqual({
      type: 'student.reported',
      schoolId: 'school1',
      occurredAt: '2026-06-29T10:00:00.000Z',
      data: {
        admissionRecordId: 'rec1',
        studentName: 'Amara',
        admissionRef: 'ADM-1',
        status: 'VERIFIED',
      },
    });
  });

  it('builds a campaign.approved envelope', () => {
    const event = buildCampaignApprovedEvent(
      'school1',
      { id: 'c1', title: 'MBA tuition', goalCents: 100_000 },
      now,
    );
    expect(event.type).toBe('campaign.approved');
    expect(event.data).toEqual({ campaignId: 'c1', title: 'MBA tuition', goalCents: 100_000 });
  });

  it('defaults occurredAt to the current time when no clock is passed', () => {
    expect(typeof buildStudentReportedEvent('s', { id: 'r', studentName: 'A', admissionRef: 'ADM', status: 'PENDING' }).occurredAt).toBe('string');
    expect(typeof buildCampaignApprovedEvent('s', { id: 'c', title: 't', goalCents: 1 }).occurredAt).toBe('string');
    expect(typeof buildPayoutSentEvent('s', { id: 'p', campaignId: 'c', amountCents: 1, reference: 'r' }).occurredAt).toBe('string');
  });

  it('builds a payout.sent envelope', () => {
    const event = buildPayoutSentEvent(
      'school1',
      { id: 'p1', campaignId: 'c1', amountCents: 100_000, reference: 'mock_payout_1' },
      now,
    );
    expect(event.type).toBe('payout.sent');
    expect(event.data).toEqual({
      payoutId: 'p1',
      campaignId: 'c1',
      amountCents: 100_000,
      reference: 'mock_payout_1',
    });
  });
});
