/**
 * E20 — pure payout-routing decision for the SCHOOL payout. Chooses LOCAL_BANK when the
 * school has an active account in the payout's country AND currency, otherwise falls
 * back to INTERNATIONAL. This only routes the payout to the school — never to a student
 * (Constitution II). No I/O, no mutation; returns a new object.
 */

import { PayoutRoute } from '@prisma/client';
import { type CurrencyCode } from './currency';

export interface RoutableAccount {
  readonly id: string;
  readonly country: string;
  readonly currency: CurrencyCode;
  readonly active: boolean;
}

export interface PayoutRouteInput {
  readonly payoutCountry: string;
  readonly payoutCurrency: CurrencyCode;
  readonly accounts: readonly RoutableAccount[];
}

export interface PayoutRouteDecision {
  readonly route: PayoutRoute;
  readonly accountId: string | null;
  readonly reason: string;
}

/**
 * Decide the payout route. A LOCAL_BANK route requires an active account matching both
 * the payout country and currency; anything else routes INTERNATIONAL as a fallback.
 */
export function decidePayoutRoute(
  input: PayoutRouteInput,
): PayoutRouteDecision {
  const country = input.payoutCountry.toUpperCase();
  const match = input.accounts.find(
    (a) =>
      a.active &&
      a.country.toUpperCase() === country &&
      a.currency === input.payoutCurrency,
  );

  if (match) {
    return {
      route: 'LOCAL_BANK',
      accountId: match.id,
      reason: `Local account in ${country}/${input.payoutCurrency}`,
    };
  }

  return {
    route: 'INTERNATIONAL',
    accountId: null,
    reason: `No active ${country}/${input.payoutCurrency} account; international fallback`,
  };
}
