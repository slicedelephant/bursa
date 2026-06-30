import {
  deriveStudentPayoutStatus,
  isPaidOut,
  payoutStatusLabel,
} from './payout-status';

describe('payout-status', () => {
  it('prefers the payout row status when a payout exists', () => {
    expect(
      deriveStudentPayoutStatus({
        status: 'DISBURSED',
        payout: { status: 'CONFIRMED' },
      }),
    ).toBe('CONFIRMED');
    expect(
      deriveStudentPayoutStatus({
        status: 'DISBURSED',
        payout: { status: 'SENT' },
      }),
    ).toBe('SENT');
    expect(
      deriveStudentPayoutStatus({
        status: 'FUNDED',
        payout: { status: 'PENDING' },
      }),
    ).toBe('READY');
  });

  it('infers from the campaign lifecycle when there is no payout row', () => {
    expect(deriveStudentPayoutStatus({ status: 'DISBURSED' })).toBe('SENT');
    expect(deriveStudentPayoutStatus({ status: 'FUNDED' })).toBe('READY');
    expect(deriveStudentPayoutStatus({ status: 'LIVE' })).toBe(
      'AWAITING_FUNDING',
    );
    expect(deriveStudentPayoutStatus({ status: 'PENDING_VERIFICATION' })).toBe(
      'AWAITING_FUNDING',
    );
    expect(deriveStudentPayoutStatus({ status: 'DRAFT' })).toBe(
      'AWAITING_FUNDING',
    );
    expect(deriveStudentPayoutStatus({ status: 'REJECTED' })).toBe('NONE');
    expect(deriveStudentPayoutStatus({ status: 'CLOSED', payout: null })).toBe(
      'NONE',
    );
  });

  it('labels every status and flags paid-out ones', () => {
    expect(payoutStatusLabel('READY')).toBe('Ready to disburse');
    expect(payoutStatusLabel('CONFIRMED')).toBe('Received by school');
    expect(isPaidOut('SENT')).toBe(true);
    expect(isPaidOut('CONFIRMED')).toBe(true);
    expect(isPaidOut('READY')).toBe(false);
    expect(isPaidOut('NONE')).toBe(false);
  });
});
