import { FxService } from './fx.service';
import { MockLocalDepositProvider } from '../payments/local/mock-local-payment.provider';
import { MockFxRateProvider } from './mock-fx-rate.provider';
import type { PaymentProvider } from '../payments/payment-provider.interface';
import type { LedgerService } from '../ledger/ledger.service';

/** Runs an action and returns the DomainException `code` it throws. */
async function codeOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (e) {
    return (e as { getResponse(): { code: string } }).getResponse().code;
  }
  throw new Error('expected the action to throw');
}

const CLOCK = () => new Date('2026-07-01T10:00:00.000Z');

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    campaign: { findUnique: jest.fn() },
    donation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    school: { findUnique: jest.fn() },
    schoolPayoutAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    ...overrides,
  } as never;
}

function buildService(prisma: unknown) {
  const ledger = {
    append: jest.fn(async () => ({ sequence: 7 })),
  } as unknown as LedgerService;
  const payments = {
    createPayout: jest.fn(async () => ({ status: 'SENT', reference: 'pay_1' })),
  } as unknown as PaymentProvider;
  const local = new MockLocalDepositProvider();
  const fxRates = new MockFxRateProvider(CLOCK);
  const service = new FxService(
    prisma as never,
    ledger,
    payments,
    local,
    fxRates,
  );
  return { service, ledger, payments };
}

describe('FxService (E20)', () => {
  describe('read-only registries', () => {
    it('lists currencies and resolves methods + labels', async () => {
      const { service } = buildService(buildPrisma());
      expect(service.listCurrencies().length).toBeGreaterThan(0);
      expect(service.methodsForCountry('KE').methods).toContain('MPESA');
      expect(service.labelsForLocale('sw').labels.amount).toBe('Kiasi');
    });

    it('quotes a rate from the FX provider', async () => {
      const { service } = buildService(buildPrisma());
      const q = await service.quote('USD', 'KES');
      expect(q.rate).toBe(129.5);
    });

    it('rejects an unknown currency in a quote', async () => {
      const { service } = buildService(buildPrisma());
      expect(await codeOf(() => service.quote('XXX', 'KES'))).toBe(
        'UNKNOWN_CURRENCY',
      );
    });
  });

  describe('initiateDeposit', () => {
    it('freezes the rate, converts to the payout currency and records a donation', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as ReturnType<typeof buildPrisma> & {
          campaign: { findUnique: jest.Mock };
          donation: { create: jest.Mock };
        }
      ).campaign.findUnique.mockResolvedValue({ id: 'c1' });
      (
        prisma as never as {
          donation: { create: jest.Mock };
        }
      ).donation.create.mockResolvedValue({ id: 'don_1' });

      const { service } = buildService(prisma);
      const result = await service.initiateDeposit({
        campaignId: 'c1',
        amountMinor: 5000,
        depositCurrency: 'USD',
        method: 'MPESA',
        country: 'KE',
        payoutCurrency: 'KES',
      });

      expect(result.status).toBe('PENDING');
      expect(result.lockedRate).toBe(129.5);
      expect(result.payoutAmountMinor).toBe(647500);
      expect(result.payoutCurrency).toBe('KES');
    });

    it('rejects a method not available in the country', async () => {
      const prisma = buildPrisma();
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.initiateDeposit({
            campaignId: 'c1',
            amountMinor: 5000,
            depositCurrency: 'USD',
            method: 'GCASH',
            country: 'KE',
            payoutCurrency: 'KES',
          }),
        ),
      ).toBe('UNSUPPORTED_METHOD');
    });

    it('rejects an unknown campaign', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          campaign: { findUnique: jest.Mock };
        }
      ).campaign.findUnique.mockResolvedValue(null);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.initiateDeposit({
            campaignId: 'nope',
            amountMinor: 5000,
            depositCurrency: 'USD',
            method: 'MPESA',
            country: 'KE',
            payoutCurrency: 'KES',
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('records a FAILED deposit status on the mock sentinel amount', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          campaign: { findUnique: jest.Mock };
          donation: { create: jest.Mock };
        }
      ).campaign.findUnique.mockResolvedValue({ id: 'c1' });
      const create = jest.fn(
        async (args: { data: { localDepositStatus: string } }) => ({
          id: 'don_2',
          ...args.data,
        }),
      );
      (prisma as never as { donation: { create: jest.Mock } }).donation.create =
        create;
      const { service } = buildService(prisma);
      const result = await service.initiateDeposit({
        campaignId: 'c1',
        amountMinor: 5013, // sentinel -> FAILED
        depositCurrency: 'USD',
        method: 'MPESA',
        country: 'KE',
        payoutCurrency: 'KES',
      });
      expect(result.status).toBe('FAILED');
      expect(create.mock.calls[0][0].data.localDepositStatus).toBe('FAILED');
    });
  });

  describe('applyWebhook', () => {
    it('advances a pending deposit to SUCCEEDED', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          donation: { findFirst: jest.Mock; update: jest.Mock };
        }
      ).donation.findFirst.mockResolvedValue({
        id: 'don_1',
        localDepositStatus: 'PENDING',
      });
      const { service } = buildService(prisma);
      const r = await service.applyWebhook({
        depositRef: 'ref_1',
        status: 'SUCCEEDED',
      });
      expect(r.status).toBe('SUCCEEDED');
    });

    it('is idempotent on an already-terminal deposit', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          donation: { findFirst: jest.Mock; update: jest.Mock };
        }
      ).donation.findFirst.mockResolvedValue({
        id: 'don_1',
        localDepositStatus: 'SUCCEEDED',
      });
      const { service } = buildService(prisma);
      const r = await service.applyWebhook({
        depositRef: 'ref_1',
        status: 'FAILED',
      });
      expect(r.status).toBe('SUCCEEDED');
    });

    it('marks a pending deposit FAILED and keeps prior providerRef', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          donation: { findFirst: jest.Mock; update: jest.Mock };
        }
      ).donation.findFirst.mockResolvedValue({
        id: 'don_1',
        localDepositStatus: 'PENDING',
        providerRef: 'prev',
        capturedAt: null,
      });
      const update = jest.fn(async () => ({}));
      (prisma as never as { donation: { update: jest.Mock } }).donation.update =
        update;
      const { service } = buildService(prisma);
      const r = await service.applyWebhook({
        depositRef: 'ref_1',
        status: 'FAILED',
      });
      expect(r.status).toBe('FAILED');
      // no providerRef in the webhook -> keep the previous one, no capturedAt set
      expect(update.mock.calls[0][0].data.providerRef).toBe('prev');
      expect(update.mock.calls[0][0].data.capturedAt).toBeNull();
    });

    it('rejects an unknown deposit', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          donation: { findFirst: jest.Mock };
        }
      ).donation.findFirst.mockResolvedValue(null);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.applyWebhook({ depositRef: 'x', status: 'SUCCEEDED' }),
        ),
      ).toBe('DEPOSIT_NOT_FOUND');
    });
  });

  describe('createSchoolAccount', () => {
    it('creates an account with a valid virtual IBAN', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
          schoolPayoutAccount: {
            findUnique: jest.Mock;
            create: jest.Mock;
          };
        }
      ).school.findUnique.mockResolvedValue({ id: 's1' });
      (
        prisma as never as {
          schoolPayoutAccount: { findUnique: jest.Mock; create: jest.Mock };
        }
      ).schoolPayoutAccount.findUnique.mockResolvedValue(null);
      (
        prisma as never as {
          schoolPayoutAccount: { create: jest.Mock };
        }
      ).schoolPayoutAccount.create.mockResolvedValue({
        id: 'acc_1',
        schoolId: 's1',
        country: 'KE',
        currency: 'KES',
        active: true,
      });

      const { service } = buildService(prisma);
      const r = await service.createSchoolAccount({
        schoolId: 's1',
        country: 'ke',
        currency: 'KES',
        bankName: 'Equity',
        accountNumber: '01234567890',
        virtualIban: 'KE12ABC12345678',
      });
      expect(r.id).toBe('acc_1');
    });

    it('rejects an invalid virtual IBAN', async () => {
      const { service } = buildService(buildPrisma());
      expect(
        await codeOf(() =>
          service.createSchoolAccount({
            schoolId: 's1',
            country: 'KE',
            currency: 'KES',
            bankName: 'Equity',
            accountNumber: '01234567890',
            virtualIban: 'KE120BC12345678',
          }),
        ),
      ).toBe('INVALID_VIRTUAL_IBAN');
    });

    it('creates an account without a virtual IBAN', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
          schoolPayoutAccount: { findUnique: jest.Mock; create: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue({ id: 's1' });
      (
        prisma as never as {
          schoolPayoutAccount: { findUnique: jest.Mock; create: jest.Mock };
        }
      ).schoolPayoutAccount.findUnique.mockResolvedValue(null);
      const create = jest.fn(
        async (args: { data: { virtualIban: unknown } }) => ({
          id: 'acc_2',
          schoolId: 's1',
          country: 'NG',
          currency: 'NGN',
          active: true,
          ...args.data,
        }),
      );
      (
        prisma as never as {
          schoolPayoutAccount: { create: jest.Mock };
        }
      ).schoolPayoutAccount.create = create;
      const { service } = buildService(prisma);
      await service.createSchoolAccount({
        schoolId: 's1',
        country: 'NG',
        currency: 'NGN',
        bankName: 'GTBank',
        accountNumber: '0123456789',
      });
      expect(create.mock.calls[0][0].data.virtualIban).toBeNull();
    });

    it('rejects an unknown school', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(null);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.createSchoolAccount({
            schoolId: 'nope',
            country: 'KE',
            currency: 'KES',
            bankName: 'Equity',
            accountNumber: '01234567890',
          }),
        ),
      ).toBe('NOT_FOUND');
    });

    it('rejects a duplicate account', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
          schoolPayoutAccount: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue({ id: 's1' });
      (
        prisma as never as {
          schoolPayoutAccount: { findUnique: jest.Mock };
        }
      ).schoolPayoutAccount.findUnique.mockResolvedValue({ id: 'acc_x' });
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.createSchoolAccount({
            schoolId: 's1',
            country: 'KE',
            currency: 'KES',
            bankName: 'Equity',
            accountNumber: '01234567890',
          }),
        ),
      ).toBe('ACCOUNT_EXISTS');
    });

    it('lists a school accounts', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          schoolPayoutAccount: { findMany: jest.Mock };
        }
      ).schoolPayoutAccount.findMany.mockResolvedValue([
        {
          id: 'acc_1',
          country: 'KE',
          currency: 'KES',
          bankName: 'Equity',
          accountNumber: '0123',
          virtualIban: null,
          active: true,
        },
      ]);
      const { service } = buildService(prisma);
      expect((await service.listSchoolAccounts('s1')).length).toBe(1);
    });
  });

  describe('payoutToSchool', () => {
    function verifiedSchool(accounts: unknown[] = []) {
      return {
        id: 's1',
        name: 'ESMT',
        payoutVerified: true,
        payoutAccountRef: 'ref',
        payoutAccounts: accounts,
      };
    }

    it('routes LOCAL_BANK, pays the school and appends a DISBURSEMENT ledger entry', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(
        verifiedSchool([
          {
            id: 'acc_1',
            country: 'KE',
            currency: 'KES',
            active: true,
            virtualIban: 'KE12ABC12345678',
          },
        ]),
      );
      const { service, ledger, payments } = buildService(prisma);
      const r = await service.payoutToSchool({
        schoolId: 's1',
        amountMinor: 647500,
        payoutCurrency: 'KES',
        payoutCountry: 'KE',
        reason: 'tuition',
      });
      expect(r.route).toBe('LOCAL_BANK');
      expect(r.currency).toBe('KES');
      expect(r.ledgerSequence).toBe(7);
      expect(
        (payments.createPayout as jest.Mock).mock.calls[0][0].currency,
      ).toBe('KES');
      expect((ledger.append as jest.Mock).mock.calls[0][0].entryType).toBe(
        'DISBURSEMENT',
      );
    });

    it('falls back to INTERNATIONAL when no local account matches', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(verifiedSchool([]));
      const { service } = buildService(prisma);
      const r = await service.payoutToSchool({
        schoolId: 's1',
        amountMinor: 5000,
        payoutCurrency: 'NGN',
        payoutCountry: 'NG',
        reason: 'tuition',
      });
      expect(r.route).toBe('INTERNATIONAL');
    });

    it('rejects an unverified school', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue({
        id: 's1',
        name: 'X',
        payoutVerified: false,
        payoutAccounts: [],
      });
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.payoutToSchool({
            schoolId: 's1',
            amountMinor: 5000,
            payoutCurrency: 'KES',
            payoutCountry: 'KE',
            reason: 'x',
          }),
        ),
      ).toBe('SCHOOL_NOT_VERIFIED');
    });

    it('uses the provided refId as the ledger reference', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(verifiedSchool([]));
      const { service, ledger } = buildService(prisma);
      await service.payoutToSchool({
        schoolId: 's1',
        amountMinor: 5000,
        payoutCurrency: 'KES',
        payoutCountry: 'KE',
        reason: 'x',
        refId: 'my_ref',
      });
      expect((ledger.append as jest.Mock).mock.calls[0][0].refId).toBe(
        'my_ref',
      );
    });

    it('throws PAYOUT_FAILED when the provider does not send', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(verifiedSchool([]));
      const ledger = { append: jest.fn() } as unknown as LedgerService;
      const payments = {
        createPayout: jest.fn(async () => ({
          status: 'FAILED',
          reference: 'x',
          failureReason: 'boom',
        })),
      } as unknown as PaymentProvider;
      const service = new FxService(
        prisma as never,
        ledger,
        payments,
        new MockLocalDepositProvider(),
        new MockFxRateProvider(CLOCK),
      );
      expect(
        await codeOf(() =>
          service.payoutToSchool({
            schoolId: 's1',
            amountMinor: 5000,
            payoutCurrency: 'KES',
            payoutCountry: 'KE',
            reason: 'x',
          }),
        ),
      ).toBe('PAYOUT_FAILED');
      expect(ledger.append).not.toHaveBeenCalled();
    });

    it('rejects an unknown school', async () => {
      const prisma = buildPrisma();
      (
        prisma as never as {
          school: { findUnique: jest.Mock };
        }
      ).school.findUnique.mockResolvedValue(null);
      const { service } = buildService(prisma);
      expect(
        await codeOf(() =>
          service.payoutToSchool({
            schoolId: 'nope',
            amountMinor: 5000,
            payoutCurrency: 'KES',
            payoutCountry: 'KE',
            reason: 'x',
          }),
        ),
      ).toBe('NOT_FOUND');
    });
  });
});
