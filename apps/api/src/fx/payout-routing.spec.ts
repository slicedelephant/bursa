import { decidePayoutRoute, type RoutableAccount } from './payout-routing';

const KES_ACCOUNT: RoutableAccount = {
  id: 'acc_1',
  country: 'KE',
  currency: 'KES',
  active: true,
};

describe('decidePayoutRoute (E20)', () => {
  it('routes LOCAL_BANK when an active matching account exists', () => {
    const d = decidePayoutRoute({
      payoutCountry: 'KE',
      payoutCurrency: 'KES',
      accounts: [KES_ACCOUNT],
    });
    expect(d.route).toBe('LOCAL_BANK');
    expect(d.accountId).toBe('acc_1');
  });

  it('matches case-insensitively on country', () => {
    const d = decidePayoutRoute({
      payoutCountry: 'ke',
      payoutCurrency: 'KES',
      accounts: [KES_ACCOUNT],
    });
    expect(d.route).toBe('LOCAL_BANK');
  });

  it('falls back to INTERNATIONAL when currency does not match', () => {
    const d = decidePayoutRoute({
      payoutCountry: 'KE',
      payoutCurrency: 'USD',
      accounts: [KES_ACCOUNT],
    });
    expect(d.route).toBe('INTERNATIONAL');
    expect(d.accountId).toBeNull();
  });

  it('falls back to INTERNATIONAL when the account is inactive', () => {
    const d = decidePayoutRoute({
      payoutCountry: 'KE',
      payoutCurrency: 'KES',
      accounts: [{ ...KES_ACCOUNT, active: false }],
    });
    expect(d.route).toBe('INTERNATIONAL');
  });

  it('falls back to INTERNATIONAL when there are no accounts', () => {
    const d = decidePayoutRoute({
      payoutCountry: 'NG',
      payoutCurrency: 'NGN',
      accounts: [],
    });
    expect(d.route).toBe('INTERNATIONAL');
    expect(d.reason).toContain('international fallback');
  });
});
