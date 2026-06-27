import { MockPaymentProvider } from './mock-payment.provider';

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider();

  it('succeeds for a normal card charge', async () => {
    const r = await provider.createCardCharge({
      amountCents: 5000,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('SUCCEEDED');
    expect(r.reference).toContain('mock_card_');
  });

  it('fails deterministically for amounts ending in .13', async () => {
    const r = await provider.createCardCharge({
      amountCents: 5013,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('FAILED');
    expect(r.failureReason).toBeTruthy();
  });

  it('succeeds for a SEPA pledge', async () => {
    const r = await provider.createSepaPledge({
      amountCents: 2_000_000,
      currency: 'EUR',
      method: 'SEPA',
    });
    expect(r.status).toBe('SUCCEEDED');
  });

  it('authorizes a pledge without charging (savePledge)', async () => {
    const r = await provider.savePledge({
      amountCents: 5000,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('AUTHORIZED');
    expect(r.pledgeRef).toContain('mock_pledge_');
  });

  it('fails to authorize a pledge for the .13 sentinel', async () => {
    const r = await provider.savePledge({
      amountCents: 1013,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('FAILED');
    expect(r.failureReason).toBeTruthy();
  });

  it('captures a saved pledge once the goal is reached', async () => {
    const r = await provider.captureOnGoalReached({
      pledgeRef: 'mock_pledge_x',
      amountCents: 5000,
      currency: 'EUR',
    });
    expect(r.status).toBe('SUCCEEDED');
    expect(r.reference).toContain('mock_capture_');
  });

  it('fails capture for the .13 sentinel', async () => {
    const r = await provider.captureOnGoalReached({
      pledgeRef: 'mock_pledge_x',
      amountCents: 1013,
      currency: 'EUR',
    });
    expect(r.status).toBe('FAILED');
  });

  it('charges immediately for a corporate full-tuition card (chargeImmediately)', async () => {
    const r = await provider.chargeImmediately({
      amountCents: 2_360_000,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('SUCCEEDED');
    expect(r.reference).toContain('mock_charge_');
  });

  it('fails chargeImmediately for the .13 sentinel', async () => {
    const r = await provider.chargeImmediately({
      amountCents: 1013,
      currency: 'EUR',
      method: 'CARD',
    });
    expect(r.status).toBe('FAILED');
    expect(r.failureReason).toBeTruthy();
  });

  it('always sends payouts (legacy + payoutToSchool)', async () => {
    const input = {
      amountCents: 100_000,
      currency: 'EUR',
      schoolName: 'ESMT Berlin',
      accountRef: 'DE89-MOCK',
    };
    const legacy = await provider.createPayout(input);
    const direct = await provider.payoutToSchool(input);
    expect(legacy.status).toBe('SENT');
    expect(direct.status).toBe('SENT');
    expect(direct.reference).toContain('mock_payout_');
  });
});
