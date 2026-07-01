import { MockLocalDepositProvider } from './mock-local-payment.provider';

describe('MockLocalDepositProvider (E20)', () => {
  const provider = new MockLocalDepositProvider();

  it('returns a PENDING reference for a normal amount', async () => {
    const r = await provider.initiateDeposit({
      amountMinor: 5000,
      currency: 'USD',
      method: 'MPESA',
      country: 'KE',
    });
    expect(r.status).toBe('PENDING');
    expect(r.reference).toContain('mock_local_mpesa_');
  });

  it('fails deterministically on the .13 sentinel amount', async () => {
    const r = await provider.initiateDeposit({
      amountMinor: 5013,
      currency: 'USD',
      method: 'GCASH',
      country: 'PH',
    });
    expect(r.status).toBe('FAILED');
    expect(r.failureReason).toContain('mock sentinel');
  });

  it('encodes the method in the reference', async () => {
    const r = await provider.initiateDeposit({
      amountMinor: 1000,
      currency: 'BDT',
      method: 'BKASH',
      country: 'BD',
    });
    expect(r.reference).toContain('bkash');
  });
});
