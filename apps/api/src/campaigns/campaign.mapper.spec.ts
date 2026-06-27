import { percentOf, toDetail } from './campaign.mapper';

describe('percentOf', () => {
  it('computes a normal percentage', () => {
    expect(percentOf(5000, 10000)).toBe(50);
  });

  it('caps at 100 when over-funded', () => {
    expect(percentOf(20000, 10000)).toBe(100);
  });

  it('returns 0 for a zero or negative goal', () => {
    expect(percentOf(100, 0)).toBe(0);
  });

  it('rounds to the nearest whole percent', () => {
    expect(percentOf(3333, 10000)).toBe(33);
  });
});

type DetailInput = Parameters<typeof toDetail>[0];

const now = new Date('2026-06-01T00:00:00.000Z');

const makeDetail = (over: Record<string, unknown> = {}): DetailInput => {
  const base = {
    id: 'camp_1',
    studentProfileId: 'sp_1',
    schoolId: 'school_1',
    programName: 'MBA',
    title: 'Help me study',
    story: 'My story',
    goalCents: 1_000_000,
    currency: 'EUR',
    raisedCents: 500_000,
    tipsCents: 0,
    status: 'LIVE',
    deadline: null,
    createdAt: now,
    updatedAt: now,
    studentProfile: {
      id: 'sp_1',
      userId: 'user_1',
      fullName: 'Ada Lovelace',
      country: 'GB',
      photoUrl: null,
      story: 'My story',
      recommendation: null,
      createdAt: now,
    },
    school: {
      id: 'school_1',
      name: 'ESMT Berlin',
      country: 'DE',
      city: 'Berlin',
      website: null,
      logoUrl: null,
      payoutVerified: true,
      payoutAccountRef: 'DE89-MOCK',
      createdAt: now,
    },
    verification: {
      id: 'ver_1',
      campaignId: 'camp_1',
      status: 'VERIFIED',
      admissionRef: 'ADM-1',
      note: null,
      verifiedById: 'admin_1',
      verifiedAt: now,
      createdAt: now,
    },
    payout: null,
    donations: [],
    updates: [],
  };
  return { ...base, ...over } as DetailInput;
};

describe('toDetail trust projection', () => {
  it('sets all trust flags for a verified campaign with a confirmed school', () => {
    const result = toDetail(makeDetail());
    expect(result.trust).toEqual({
      admissionVerified: true,
      schoolConfirmed: true,
      identityChecked: true,
    });
  });

  it('derives admissionVerified and identityChecked from the verification status', () => {
    const result = toDetail(
      makeDetail({
        verification: {
          id: 'ver_1',
          campaignId: 'camp_1',
          status: 'PENDING',
          admissionRef: 'ADM-1',
          note: null,
          verifiedById: 'admin_1',
          verifiedAt: null,
          createdAt: now,
        },
      }),
    );
    expect(result.trust.admissionVerified).toBe(false);
    expect(result.trust.identityChecked).toBe(false);
  });

  it('reflects the school payout-verified flag in schoolConfirmed', () => {
    const result = toDetail(
      makeDetail({
        school: {
          id: 'school_1',
          name: 'ESMT Berlin',
          country: 'DE',
          city: 'Berlin',
          website: null,
          logoUrl: null,
          payoutVerified: false,
          payoutAccountRef: null,
          createdAt: now,
        },
      }),
    );
    expect(result.trust.schoolConfirmed).toBe(false);
  });

  it('never exposes internal verifier ids', () => {
    const result = toDetail(makeDetail());
    expect(JSON.stringify(result)).not.toContain('verifiedById');
    expect(JSON.stringify(result)).not.toContain('admin_1');
  });
});

describe('toDetail payout proof', () => {
  it('maps a public payout proof for a DISBURSED campaign with a payout', () => {
    const sentAt = new Date('2026-06-20T10:00:00.000Z');
    const result = toDetail(
      makeDetail({
        status: 'DISBURSED',
        payout: {
          id: 'pay_1',
          campaignId: 'camp_1',
          schoolId: 'school_1',
          amountCents: 1_000_000,
          method: 'SEPA',
          reference: 'mock_payout_abc',
          status: 'CONFIRMED',
          proofNote: 'internal note',
          createdAt: now,
          sentAt,
        },
      }),
    );
    expect(result.payoutProof).toEqual({
      schoolName: 'ESMT Berlin',
      amountCents: 1_000_000,
      reference: 'mock_payout_abc',
      status: 'CONFIRMED',
      sentAt,
    });
  });

  it('omits the proof note (internal) from the payout proof', () => {
    const result = toDetail(
      makeDetail({
        status: 'DISBURSED',
        payout: {
          id: 'pay_1',
          campaignId: 'camp_1',
          schoolId: 'school_1',
          amountCents: 1_000_000,
          method: 'SEPA',
          reference: 'mock_payout_abc',
          status: 'CONFIRMED',
          proofNote: 'internal note',
          createdAt: now,
          sentAt: now,
        },
      }),
    );
    expect(result.payoutProof).not.toBeNull();
    expect(JSON.stringify(result.payoutProof)).not.toContain('internal note');
  });

  it('returns no proof for a LIVE campaign without a payout', () => {
    const result = toDetail(makeDetail({ status: 'LIVE', payout: null }));
    expect(result.payoutProof).toBeNull();
  });

  it('returns no proof for a DISBURSED campaign that has no payout record', () => {
    const result = toDetail(makeDetail({ status: 'DISBURSED', payout: null }));
    expect(result.payoutProof).toBeNull();
  });
});
