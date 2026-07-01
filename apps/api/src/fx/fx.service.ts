/**
 * E20 — Multi-Currency & local payment methods (orchestration).
 *
 * Thin service over the pure cores + reused infra. Money NEVER touches a student:
 * every payout targets the verified SCHOOL via the E2 `PaymentProvider.createPayout`
 * and is recorded in the E12 append-only `LedgerService` (Constitution II + IV). Local
 * methods are donor-DEPOSIT only, behind the `LocalDepositProvider` seam. FX is frozen at
 * deposit time from the `FxRateProvider` (mock) and converted with the pure minor-unit
 * cores. Returns plain data; the `{success,data,error}` envelope is applied by the global
 * interceptor. Boundary/domain errors are thrown via `DomainException(code, msg, status)`.
 */

import { Inject, Injectable } from '@nestjs/common';
import { LocalPaymentMethod } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { LedgerService } from '../ledger/ledger.service';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import {
  LOCAL_DEPOSIT_PROVIDER,
  type LocalDepositProvider,
} from '../payments/local/local-payment.provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { assertCurrency, listCurrencies, type CurrencyCode } from './currency';
import { convertMinorUnits } from './currency-converter';
import {
  FX_RATE_PROVIDER,
  type FxRateProvider,
} from './fx-rate.provider.interface';
import { resolveLabels, type LabelKey } from './i18n-labels';
import { validateVirtualIban } from './local-bank-detail';
import {
  isMethodAvailable,
  resolvePaymentMethods,
} from './payment-method-resolver';
import { decidePayoutRoute, type RoutableAccount } from './payout-routing';
import type {
  CreatePayoutDto,
  CreateSchoolAccountDto,
  InitiateDepositDto,
  LocalPaymentWebhookDto,
} from './dto/fx.dto';

@Injectable()
export class FxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    @Inject(LOCAL_DEPOSIT_PROVIDER)
    private readonly localDeposit: LocalDepositProvider,
    @Inject(FX_RATE_PROVIDER) private readonly fxRates: FxRateProvider,
  ) {}

  // ---- Read-only registries ------------------------------------------------

  listCurrencies() {
    return listCurrencies();
  }

  methodsForCountry(country: string) {
    return resolvePaymentMethods(country);
  }

  labelsForLocale(locale: string, keys?: LabelKey[]) {
    return resolveLabels(locale, keys);
  }

  /** Quote (freeze) a rate for a base->quote pair from the FX provider. */
  async quote(base: string, quote: string) {
    assertCurrency(base);
    assertCurrency(quote);
    const result = await this.fxRates.getRate({ base, quote });
    return {
      base: result.base as CurrencyCode,
      quote: result.quote as CurrencyCode,
      rate: result.rate,
      quotedAt: result.asOf,
    };
  }

  // ---- Donor deposit -------------------------------------------------------

  /**
   * Initiate a local donor deposit. Freezes the deposit->payout rate, converts the
   * amount the SCHOOL will receive, records it on the donation, and returns a PENDING
   * reference. No money moves to a student; this is donor money coming IN.
   */
  async initiateDeposit(dto: InitiateDepositDto) {
    assertCurrency(dto.depositCurrency);
    assertCurrency(dto.payoutCurrency);

    if (!isMethodAvailable(dto.country, dto.method)) {
      throw new DomainException(
        'UNSUPPORTED_METHOD',
        `${dto.method} is not available in ${dto.country}`,
        400,
      );
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }

    const quote = await this.quote(dto.depositCurrency, dto.payoutCurrency);
    const converted = convertMinorUnits({
      amountMinor: dto.amountMinor,
      from: dto.depositCurrency as CurrencyCode,
      to: dto.payoutCurrency as CurrencyCode,
      lockedRate: quote.rate,
    });

    const initiated = await this.localDeposit.initiateDeposit({
      amountMinor: dto.amountMinor,
      currency: dto.depositCurrency,
      method: dto.method,
      country: dto.country,
      payerRef: dto.payerRef,
    });

    const donation = await this.prisma.donation.create({
      data: {
        campaignId: dto.campaignId,
        amountCents: dto.amountMinor,
        currency: dto.depositCurrency,
        method: this.donationMethod(dto.method),
        type: 'PRIVATE',
        status: 'PENDING',
        depositCurrency: dto.depositCurrency,
        depositMethod: dto.method,
        lockedRate: quote.rate,
        payoutCurrency: dto.payoutCurrency,
        localDepositRef: initiated.reference,
        localDepositStatus:
          initiated.status === 'PENDING' ? 'PENDING' : 'FAILED',
      },
    });

    return {
      donationId: donation.id,
      depositRef: initiated.reference,
      status: initiated.status,
      lockedRate: quote.rate,
      payoutAmountMinor: converted.amountMinor,
      payoutCurrency: dto.payoutCurrency,
    };
  }

  /**
   * Apply a signed webhook status update to a pending local deposit. Only advances a
   * deposit from PENDING; already-terminal deposits are returned unchanged.
   */
  async applyWebhook(dto: LocalPaymentWebhookDto) {
    const donation = await this.prisma.donation.findFirst({
      where: { localDepositRef: dto.depositRef },
    });
    if (!donation) {
      throw new DomainException('DEPOSIT_NOT_FOUND', 'Unknown deposit', 404);
    }

    if (donation.localDepositStatus !== 'PENDING') {
      return {
        depositRef: dto.depositRef,
        status: donation.localDepositStatus,
      };
    }

    const succeeded = dto.status === 'SUCCEEDED';
    await this.prisma.donation.update({
      where: { id: donation.id },
      data: {
        localDepositStatus: dto.status,
        status: succeeded ? 'SUCCEEDED' : 'FAILED',
        providerRef: dto.providerRef ?? donation.providerRef,
        capturedAt: succeeded ? new Date() : donation.capturedAt,
      },
    });

    return { depositRef: dto.depositRef, status: dto.status };
  }

  // ---- School payout accounts ----------------------------------------------

  async createSchoolAccount(dto: CreateSchoolAccountDto) {
    assertCurrency(dto.currency);

    if (dto.virtualIban && !validateVirtualIban(dto.virtualIban)) {
      throw new DomainException(
        'INVALID_VIRTUAL_IBAN',
        'Virtual IBAN failed structural/checksum validation',
        400,
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }

    const existing = await this.prisma.schoolPayoutAccount.findUnique({
      where: {
        schoolId_country_currency: {
          schoolId: dto.schoolId,
          country: dto.country.toUpperCase(),
          currency: dto.currency,
        },
      },
    });
    if (existing) {
      throw new DomainException(
        'ACCOUNT_EXISTS',
        'School already has an account for this country/currency',
        409,
      );
    }

    const account = await this.prisma.schoolPayoutAccount.create({
      data: {
        schoolId: dto.schoolId,
        country: dto.country.toUpperCase(),
        currency: dto.currency,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        virtualIban: dto.virtualIban ?? null,
      },
    });

    return {
      id: account.id,
      schoolId: account.schoolId,
      country: account.country,
      currency: account.currency,
      active: account.active,
    };
  }

  async listSchoolAccounts(schoolId: string) {
    const accounts = await this.prisma.schoolPayoutAccount.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });
    return accounts.map((a) => ({
      id: a.id,
      country: a.country,
      currency: a.currency,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      virtualIban: a.virtualIban,
      active: a.active,
    }));
  }

  // ---- Payout to the SCHOOL (local currency) -------------------------------

  /**
   * Pay a school in a local currency. Chooses a route (LOCAL_BANK vs INTERNATIONAL),
   * pays via the E2 provider and records a DISBURSEMENT in the append-only ledger. The
   * target is ALWAYS the verified school (Constitution II) — never a student.
   */
  async payoutToSchool(dto: CreatePayoutDto) {
    assertCurrency(dto.payoutCurrency);

    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
      include: { payoutAccounts: true },
    });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }
    if (!school.payoutVerified) {
      throw new DomainException(
        'SCHOOL_NOT_VERIFIED',
        'The school has no verified payout account',
        409,
      );
    }

    const routable: RoutableAccount[] = school.payoutAccounts.map((a) => ({
      id: a.id,
      country: a.country,
      currency: a.currency as CurrencyCode,
      active: a.active,
    }));

    const decision = decidePayoutRoute({
      payoutCountry: dto.payoutCountry,
      payoutCurrency: dto.payoutCurrency as CurrencyCode,
      accounts: routable,
    });

    const accountRef =
      school.payoutAccounts.find((a) => a.id === decision.accountId)
        ?.virtualIban ??
      school.payoutAccountRef ??
      'international';

    const payout = await this.payments.createPayout({
      amountCents: dto.amountMinor,
      currency: dto.payoutCurrency,
      schoolName: school.name,
      accountRef,
      description: `${dto.reason} (${decision.route})`,
    });

    if (payout.status !== 'SENT') {
      throw new DomainException(
        'PAYOUT_FAILED',
        payout.failureReason ?? 'Payout could not be sent',
        502,
      );
    }

    const entry = await this.ledger.append({
      entryType: 'DISBURSEMENT',
      amountCents: dto.amountMinor,
      currency: dto.payoutCurrency,
      schoolId: school.id,
      reason: dto.reason,
      refType: 'local_payout',
      refId: dto.refId ?? payout.reference,
    });

    return {
      route: decision.route,
      payoutRef: payout.reference,
      ledgerSequence: entry.sequence,
      currency: dto.payoutCurrency,
    };
  }

  // ---- helpers -------------------------------------------------------------

  /** Map a local method to the coarse DonationMethod stored on the donation (E2 enum). */
  private donationMethod(method: LocalPaymentMethod) {
    return method === 'SEPA' ? 'SEPA' : 'CARD';
  }
}
