import { createReferralCode } from './referral-code.util';
import {
  AttributionInput,
  COUNTED_DONATION_STATUSES,
  resolveAttribution,
} from './referral-attribution.util';

describe('referral-attribution.util', () => {
  const created = createReferralCode({
    bytes: () => Buffer.from('1122334455667788aabb', 'hex'),
  });
  const record = { codeHash: created.codeHash };

  const base: AttributionInput = {
    code: created.code,
    record,
    kind: 'REFERRAL',
    donationStatus: 'SUCCEEDED',
    donorUserId: 'donor-1',
    referrerUserId: 'referrer-1',
    alreadyAttributed: false,
  };

  it('attributes a valid, counted, non-self, fresh donation', () => {
    const decision = resolveAttribution(base);
    expect(decision.attribute).toBe(true);
    expect(decision.kind).toBe('REFERRAL');
    expect(decision.reason).toBeUndefined();
    expect(decision.codeValidation.valid).toBe(true);
  });

  it.each(COUNTED_DONATION_STATUSES)(
    'attributes counted status %s',
    (status) => {
      expect(
        resolveAttribution({ ...base, donationStatus: status }).attribute,
      ).toBe(true);
    },
  );

  it('skips an invalid code', () => {
    const decision = resolveAttribution({ ...base, code: 'wrong' });
    expect(decision.attribute).toBe(false);
    expect(decision.reason).toBe('invalid_code');
  });

  it('skips a missing record', () => {
    const decision = resolveAttribution({ ...base, record: null });
    expect(decision.attribute).toBe(false);
    expect(decision.reason).toBe('invalid_code');
  });

  it('skips an uncounted status (PENDING/FAILED/EXPIRED)', () => {
    for (const status of ['PENDING', 'FAILED', 'EXPIRED']) {
      const decision = resolveAttribution({ ...base, donationStatus: status });
      expect(decision.attribute).toBe(false);
      expect(decision.reason).toBe('uncounted_status');
    }
  });

  it('skips self-referral (donor === referrer)', () => {
    const decision = resolveAttribution({
      ...base,
      donorUserId: 'same',
      referrerUserId: 'same',
    });
    expect(decision.attribute).toBe(false);
    expect(decision.reason).toBe('self_referral');
  });

  it('does not flag self-referral for an anonymous donor', () => {
    const decision = resolveAttribution({
      ...base,
      donorUserId: null,
      referrerUserId: 'referrer-1',
    });
    expect(decision.attribute).toBe(true);
  });

  it('skips an already-attributed donation (dedupe)', () => {
    const decision = resolveAttribution({ ...base, alreadyAttributed: true });
    expect(decision.attribute).toBe(false);
    expect(decision.reason).toBe('already_attributed');
  });

  it('carries the advocate kind through', () => {
    expect(resolveAttribution({ ...base, kind: 'ADVOCATE' }).kind).toBe(
      'ADVOCATE',
    );
  });
});
