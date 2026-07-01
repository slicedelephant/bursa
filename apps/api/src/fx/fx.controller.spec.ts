import { FxController } from './fx.controller';
import { LocalPaymentWebhookController } from './local-payment-webhook.controller';
import type { FxService } from './fx.service';

function buildService() {
  return {
    listCurrencies: jest.fn(() => [{ code: 'KES' }]),
    quote: jest.fn(async () => ({ rate: 129.5 })),
    methodsForCountry: jest.fn(() => ({ country: 'KE', methods: ['MPESA'] })),
    labelsForLocale: jest.fn(() => ({ locale: 'sw', labels: {} })),
    initiateDeposit: jest.fn(async () => ({ status: 'PENDING' })),
    createSchoolAccount: jest.fn(async () => ({ id: 'acc_1' })),
    listSchoolAccounts: jest.fn(async () => []),
    payoutToSchool: jest.fn(async () => ({ route: 'LOCAL_BANK' })),
    applyWebhook: jest.fn(async () => ({ status: 'SUCCEEDED' })),
  } as unknown as FxService;
}

describe('FxController (E20)', () => {
  it('delegates all read routes to the service', async () => {
    const svc = buildService();
    const c = new FxController(svc);
    expect(c.currencies()).toEqual([{ code: 'KES' }]);
    expect(await c.quote('USD', 'KES')).toEqual({ rate: 129.5 });
    expect(c.methods('KE').methods).toContain('MPESA');
    expect(c.labels('sw').locale).toBe('sw');
  });

  it('delegates deposit, accounts and payout', async () => {
    const svc = buildService();
    const c = new FxController(svc);

    const deposit = await c.initiateDeposit({
      campaignId: 'c1',
      amountMinor: 5000,
      depositCurrency: 'USD',
      method: 'MPESA',
      country: 'KE',
      payoutCurrency: 'KES',
    });
    expect(deposit.status).toBe('PENDING');

    const account = await c.createSchoolAccount({
      schoolId: 's1',
      country: 'KE',
      currency: 'KES',
      bankName: 'B',
      accountNumber: '1',
    });
    expect(account.id).toBe('acc_1');

    expect(await c.listSchoolAccounts('s1')).toEqual([]);

    const payout = await c.payout({
      schoolId: 's1',
      amountMinor: 5000,
      payoutCurrency: 'KES',
      payoutCountry: 'KE',
      reason: 'x',
    });
    expect(payout.route).toBe('LOCAL_BANK');
  });

  it('defaults missing query params on methods/labels', () => {
    const svc = buildService();
    const c = new FxController(svc);
    c.methods(undefined as never);
    c.labels(undefined as never);
    expect(svc.methodsForCountry).toHaveBeenCalledWith('');
    expect(svc.labelsForLocale).toHaveBeenCalledWith('en');
  });
});

describe('LocalPaymentWebhookController (E20)', () => {
  it('delegates the webhook to the service', async () => {
    const svc = buildService();
    const c = new LocalPaymentWebhookController(svc);
    const r = await c.handle({ depositRef: 'ref', status: 'SUCCEEDED' });
    expect(r.status).toBe('SUCCEEDED');
  });
});
