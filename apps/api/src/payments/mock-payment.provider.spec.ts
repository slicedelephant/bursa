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

  it('always sends payouts', async () => {
    const r = await provider.createPayout({
      amountCents: 100_000,
      currency: 'EUR',
      schoolName: 'ESMT Berlin',
      accountRef: 'DE89-MOCK',
    });
    expect(r.status).toBe('SENT');
    expect(r.reference).toContain('mock_payout_');
  });
});
