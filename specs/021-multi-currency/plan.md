# Plan 021 — Multi-Currency & lokale Zahlungsmethoden (E20)

## Wiederverwendung (kein Neubau)

- **E2 Payment-Seam** (`apps/api/src/payments/payment-provider.interface.ts`,
  `payment-provider.factory.ts`): Der Schul-Payout nutzt unverändert
  `PaymentProvider.createPayout({ amountCents, currency, schoolName, accountRef, ... })` —
  das targetet die **Schule**, nie einen Studierenden. Die lokalen Donor-Deposit-Provider
  sind zusätzliche Implementierungen **in derselben Linie** (`LocalDepositProvider` +
  env-gegatete Factory `createLocalDepositProvider`, Mock-Default) — genau das Muster von
  `createPaymentProvider`. Kein zweiter Payout-Pfad.
- **E12 Ledger** (`apps/api/src/ledger/ledger.service.ts`): Jeder Payout an die Schule,
  in jeder Währung, wird über `LedgerService.append({ entryType: 'DISBURSEMENT', schoolId,
  amountCents, currency, reason, refType: 'local_payout', refId }, now)` in den
  **append-only** Ledger geschrieben. `MovementInput.currency` existiert bereits — der
  Ledger ist von Haus aus multi-currency-fähig. Keine zweite Ledger-Implementierung.
- **E8 Schools** (`apps/api/src/schools/`): Payout-Ziel ist eine verifizierte `School`.
  Neu ist `SchoolPayoutAccount` (pro Schule/Land: Landeswährung, lokale Bank / Virtual-IBAN,
  aktiv-Flag) als Ergänzung am `School`-Modell. Der Payout setzt `School.payoutVerified`
  voraus wie im bestehenden `PayoutsService`.
- **E11 KYC** (`apps/api/src/kyc/`): Die Per-Land-KYC-Variation liefert nur ein
  länderspezifisches Requirement (`resolveKycRequirement`) an die bestehende
  KYC-/Verification-Pipeline; kein neuer Identity-/AML-Provider, keine zweite Pipeline.
- **E6 Webhook-Guard** (`apps/api/src/security/webhook-signature.ts`,
  `stripe-webhook.guard.ts`): Der `local-payment.webhook`-Endpoint nutzt exakt das
  E6-Muster — `verifyWebhookSignature({ rawBody, header, secret, nowSec })`, fail-closed
  `400 INVALID_SIGNATURE` über einen eigenen `LocalPaymentWebhookGuard` (Copy des
  `StripeWebhookGuard`-Musters, eigener Header + Secret). Kein neuer Signatur-Algorithmus.

## Provider- & FX-Naht (Kern-Design)

- **Local-Deposit-Seam:** `LocalDepositProvider` (`initiateDeposit(input) →
  { status: 'PENDING'; reference }`) + `LOCAL_DEPOSIT_PROVIDER`-Symbol +
  `createLocalDepositProvider(env)`-Factory. Default `MockLocalDepositProvider`
  (deterministisch, `-FAIL`-Sentinel wie MockPaymentProvider); `MpesaDepositProvider` ist
  ein kompilierendes Real-Skeleton (lazy require, in Tests nie aktiv). Der Provider liefert
  nur eine PENDING-Referenz — der finale Status kommt über den signierten Webhook.
- **FX-Seam:** `FxRateProvider` (`getRate({ base, quote }) → { rate; asOf }`) +
  `FX_RATE_PROVIDER`-Symbol + `createFxRateProvider(env)`-Factory. Default
  `MockFxRateProvider` (deterministische Tabelle, kein Netz). Die **Fixierung** des Kurses
  (`quoteLockedRate`) und jede Konvertierung sind **reine Logik** mit injizierten Kursen;
  der Provider liefert nur Rohkurse. Kein `Date.now()` in den Kernen — `now` wird injiziert.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe, ruft kein I/O. Kurse und
`now` werden **injiziert** — kein `Date.now()`, keine Floats für gespeichertes Geld.

1. `fx/currency.ts` — `getCurrency(code)` / `assertCurrency(code)` (Registry: EUR, USD, KES,
   NGN, GHS, BDT, PHP, VND mit `decimals`/`symbol`/`name`); unbekannt → wirft.
2. `fx/money-minor-unit.ts` — Minor-Unit-Helfer: `toMinorUnits(amount, decimals)`,
   `fromMinorUnits(cents, decimals)`, `formatMinorUnits(cents, currency)`,
   `roundHalfUp(n)` — integer-safe, keine Float-Drift.
3. `fx/currency-converter.ts` — `convertMinorUnits({ amountMinor, from, to, lockedRate })` →
   `{ amountMinor; from; to; rate }` (Identität bei gleicher Währung, round-half-up über die
   `decimals` beider Währungen).
4. `fx/fx-slippage.ts` — `computeFxSlippage({ amountMinor, lockedRate, settledRate,
   decimals })` → `{ slippageMinor; slippageBps; direction }`.
5. `fx/locked-rate.ts` — `quoteLockedRate({ base, quote, table, now })` →
   `{ base; quote; rate; quotedAt }` (fixiert aus injizierter Tabelle; unbekanntes Paar →
   wirft).
6. `fx/payment-method-resolver.ts` — `resolvePaymentMethods(country)` → Liste verfügbarer
   `LocalPaymentMethod` + globaler Card-Fallback (deterministische Länder-Registry).
7. `fx/payout-routing.ts` — `decidePayoutRoute({ payoutCountry, payoutCurrency, accounts })`
   → `{ route: 'LOCAL_BANK' | 'INTERNATIONAL'; accountId?; reason }`.
8. `fx/i18n-labels.ts` — `resolveLabels(locale, keys)` → `Record<key, string>` mit
   deterministischem `en`-Fallback (Sample-Label-Tabelle für en/sw/yo/bn/tl).
9. `fx/local-bank-detail.ts` — `validateVirtualIban(value)`,
   `formatLocalBankDetail({ country, bankName, accountNumber, virtualIban })` (Länge/Präfix/
   Mod-97-artige Prüfsumme, display-only).
10. `fx/country-kyc-requirement.ts` — `resolveKycRequirement(country)` →
    `{ document: 'BVN' | 'NATIONAL_ID' | 'PASSPORT'; amlThresholdMinor }` (speist E11).

## Service / Controller / Modul

- **`fx/fx.service.ts`** — orchestriert dünn: Currency-/Rate-Quote (Provider → reine
  Fixierung), Deposit-Initiierung (`LocalDepositProvider`), Payout **an die Schule** in
  Landeswährung (`PaymentProvider.createPayout` + `LedgerService.append` +
  `decidePayoutRoute`), Slippage-Berechnung, SchoolPayoutAccount-CRUD. Die Rechen-Logik
  liegt in den Kernen. Wirft `DomainException(code, msg, status)`; gibt Plain-Data zurück
  (Envelope kommt vom Interceptor).
- **`fx/fx.controller.ts`** (gemischt gegatet):
  - `GET  /fx/currencies` — unterstützte Währungen (öffentlich)
  - `GET  /fx/quote?base=&quote=` (FR-5) — Locked-Rate-Quote (öffentlich, lesend)
  - `GET  /fx/methods?country=` (FR-6) — verfügbare lokale Methoden (öffentlich)
  - `GET  /fx/labels?locale=` (FR-8) — Donate-Flow-Labels (öffentlich)
  - `POST /fx/deposits` (FR-11) — lokalen Deposit initiieren (öffentlich/DONOR, Mock)
  - `POST /fx/school-accounts` (FR-9) — lokales Auszahlungskonto anlegen
    (`SCHOOL_ADMIN`/`ADMIN`)
  - `GET  /fx/school-accounts/:schoolId` — Konten einer Schule
  - `POST /fx/payouts` (FR-1, FR-7) — Payout an die Schule in Landeswährung + Routing +
    Ledger (`ADMIN`)
- **`fx/local-payment-webhook.controller.ts`** (`LocalPaymentWebhookGuard`, rawBody):
  - `POST /fx/webhook` (FR-12) — signierter Status-Update-Webhook für lokale Deposits
- **`fx/fx.module.ts`** — bindet `LocalDepositProvider` + `FxRateProvider` über env-gegatete
  Factories (Symbol-DI), importiert `LedgerModule` und den globalen `PaymentsModule`-Seam;
  in `app.module.ts` registriert.
- **`payments/local/`** — der Deposit-Seam (Interface/Symbol, Mock, M-Pesa-Skeleton,
  Factory) liegt bewusst unter `payments/`, weil es die E2-Linie verlängert.
- **DTOs** (`fx/dto/`): `initiate-deposit.dto.ts`, `create-school-account.dto.ts`,
  `create-payout.dto.ts`, `webhook.dto.ts` — Boundary-Validierung (whitelist, coercion off).

## Datenfluss

1. Spender öffnet Kampagne → `GET /fx/currencies` + `GET /fx/methods?country=KE` +
   `GET /fx/labels?locale=sw` → sieht KES + M-Pesa + Swahili-Labels.
2. Spender initiiert `POST /fx/deposits` (Betrag, Methode, Land) → `LocalDepositProvider.
   initiateDeposit` → PENDING-Referenz. Zahlt der Spender in USD und wird die Schule in KES
   bezahlt, fixiert `quoteLockedRate` den Kurs am Deposit → an der Donation gespeichert.
3. Das lokale Gateway ruft (gemockt) `POST /fx/webhook` mit gültiger Signatur → Status wird
   auf `SUCCEEDED`/`FAILED` gesetzt (E6-Guard, fail-closed).
4. Auszahlung: `POST /fx/payouts` → `decidePayoutRoute` wählt `LOCAL_BANK` (Konto in
   Land+Währung vorhanden) oder `INTERNATIONAL` → `PaymentProvider.createPayout` **an die
   Schule** in Landeswährung → `LedgerService.append({ entryType: 'DISBURSEMENT', currency,
   ... })`. `computeFxSlippage` berechnet die Slippage (gebuchter vs. settled-Kurs).

## Constitution-Checks

- **II Geld an die Schule:** Jeder Payout — in EUR, USD, KES, NGN, … — geht ausschließlich
  über `PaymentProvider.createPayout` mit `schoolName`/`accountRef` der verifizierten Schule.
  Kein Feld, kein Pfad zahlt an einen Studierenden. Lokale Methoden sind nur Donor-Deposit.
  Jede Bewegung ist auditierbar (Ledger-Append).
- **III Provider-Abstraktion:** Deposit über `LOCAL_DEPOSIT_PROVIDER`-Symbol (Mock-Default),
  FX über `FX_RATE_PROVIDER`-Symbol (Mock-Default), Payout über `PAYMENT_PROVIDER` (E2).
  Real-Provider (M-Pesa, echtes FX) swappbar ohne Domänen-Änderung.
- **IV Immutability/kleine Module:** reine Kerne geben neue Objekte zurück; Ledger ist
  append-only; Dateien 200–400 Zeilen, nach Feature organisiert (`fx/`, `payments/local/`).
- **V Boundary-Validierung:** DTOs + `class-validator`; **Minor-Unit-Korrektheit** vor jeder
  Geld-Mutation (integer-safe, keine Floats); unbekannte Währung/Kurs → wirft;
  `{success,data,error}`.

## Frontend (Angular)

- `features/donate/localized-donate.page.ts` — lokalisierter Donate-Flow: Währungs-/
  Methoden-Auswahl je Land, i18n-Labels, FX-Anzeige (Du zahlst X USD → Schule erhält Y KES).
- `features/school-settings/school-currency.page.ts` (SCHOOL_ADMIN) — lokales
  Auszahlungskonto (Landeswährung, lokale Bank / Virtual-IBAN) setzen.
- Reine Helfer mit 80%-Gate: `currency-format.ts` (Minor-Unit → Anzeige je Währung),
  `fx-display.ts` (Locked-Rate-/Slippage-Anzeige), `method-labels.ts` (lokale
  Methoden-Labels + Badge), `i18n-resolve.ts` (Client-Label-Resolver, spiegelt den
  Backend-Kern).
- Typen in `core/models.ts` (`// ---- E20: … ----`), Service-Methoden in `api.service.ts`
  (`// ---- Multi-Currency & Local Payments (E20) ----`), Routen in `app.routes.ts`
  (`/donate/:campaignId/local` öffentlich, `/school/currency` SCHOOL_ADMIN-gegatet).

## Prisma

Neue Modelle: `SchoolPayoutAccount` (pro Schule/Land). Neue Enums: `Currency`,
`LocalPaymentMethod`, `PayoutRoute`, `LocalDepositStatus`. Felder an `Donation`
(`depositCurrency`, `depositMethod`, `lockedRate`, `payoutCurrency`, `localDepositRef`,
`localDepositStatus`) und an `School` (Relation `payoutAccounts`). Geld als `Int`-Minor-
Units; `lockedRate` als `Float` (nur der Kurs, nie das gespeicherte Geld). IDs `cuid()`.
Migration: `multi_currency`.

## Verifikation

- `npm --prefix apps/api run test:cov` grün (neue Kerne per-path 80%).
- `npm --prefix apps/web run test:cov` grün (neue Helfer + Komponenten per-path 80%).
- `npm --prefix apps/api run build` + `npm --prefix apps/web run build` grün.
- `npm --prefix apps/api run seed` sauber (idempotent, KES/M-Pesa-Demo).
- `npx prisma migrate status` → up to date; `migrate diff --exit-code` → keine Differenz.
- `prettier --check` in beiden Apps sauber.
