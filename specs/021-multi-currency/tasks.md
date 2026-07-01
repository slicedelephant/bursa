# Tasks 021 — Multi-Currency & lokale Zahlungsmethoden (E20)

## Phase 0 — Spec-Kit (Commit 1, docs)
- [x] T000 spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md
- [x] T001 Branch `021-multi-currency` von `main`

## Phase 1 — Prisma (Commit 2, feat(api))
- [x] T010 Enums `Currency`, `LocalPaymentMethod`, `PayoutRoute`, `LocalDepositStatus`
- [x] T011 Modell `SchoolPayoutAccount` + Rückrelation `School.payoutAccounts`
- [x] T012 `Donation`-Felder (`depositCurrency`, `depositMethod`, `lockedRate`,
  `payoutCurrency`, `localDepositRef`, `localDepositStatus`)
- [x] T013 Migration `multi_currency`; `migrate status` + `migrate diff --exit-code`

## Phase 2 — Pure-Logic (Tests zuerst) (Commit 2, feat(api))
- [x] T020 `fx/currency.spec.ts` + `.ts` (`getCurrency`/`assertCurrency`, Registry)
- [x] T021 `fx/money-minor-unit.spec.ts` + `.ts` (Minor-Unit-Helfer, `roundHalfUp`)
- [x] T022 `fx/currency-converter.spec.ts` + `.ts` (`convertMinorUnits`, locked-rate)
- [x] T023 `fx/fx-slippage.spec.ts` + `.ts` (`computeFxSlippage`)
- [x] T024 `fx/locked-rate.spec.ts` + `.ts` (`quoteLockedRate`, injizierte Tabelle+now)
- [x] T025 `fx/payment-method-resolver.spec.ts` + `.ts` (`resolvePaymentMethods`)
- [x] T026 `fx/payout-routing.spec.ts` + `.ts` (`decidePayoutRoute`, local vs international)
- [x] T027 `fx/i18n-labels.spec.ts` + `.ts` (`resolveLabels`, en-Fallback)
- [x] T028 `fx/local-bank-detail.spec.ts` + `.ts` (`validateVirtualIban`, Formatter)
- [x] T029 `fx/country-kyc-requirement.spec.ts` + `.ts` (`resolveKycRequirement`)

## Phase 3 — Provider-Seams + Service/Controller/Modul (Commit 2, feat(api))
- [x] T030 `payments/local/local-payment.provider.interface.ts` (+ `LOCAL_DEPOSIT_PROVIDER`)
- [x] T031 `payments/local/mock-local-payment.provider.spec.ts` + `.ts` (deterministisch)
- [x] T032 `payments/local/mpesa-payment.provider.ts` (Real-Skeleton, lazy require)
- [x] T033 `payments/local/local-payment.provider.factory.spec.ts` + `.ts` (env-gegatet)
- [x] T034 `fx/fx-rate.provider.interface.ts` (+ `FX_RATE_PROVIDER`),
  `fx/mock-fx-rate.provider.spec.ts` + `.ts`, `fx/fx-rate.provider.factory.spec.ts` + `.ts`
- [x] T035 `fx/local-payment-webhook.guard.ts` (E6-Muster, `verifyWebhookSignature`)
- [x] T036 DTOs (`initiate-deposit`, `create-school-account`, `create-payout`, `webhook`)
- [x] T037 `fx/fx.service.ts` — Currencies/Quote/Methods/Labels + Deposit-Initiierung
- [x] T038 `fx/fx.service.ts` — Payout **an die Schule** (`createPayout` + Routing + Ledger)
  + SchoolPayoutAccount-CRUD + Webhook-Statuswechsel
- [x] T039 `fx/fx.controller.ts` + `fx/local-payment-webhook.controller.ts`;
  `fx/fx.module.ts` + Registrierung in `app.module.ts` (nach `ScholarshipModule`)

## Phase 4 — Seed (Commit 2, feat(api))
- [x] T040 `clearDatabase()` um `SchoolPayoutAccount` erweitern (child-first)
- [x] T041 Demo: Schule mit KES-Konto + Virtual-IBAN, Kampagne KES-fähig, M-Pesa-Spende mit
  fixiertem USD→KES-Kurs, `DISBURSEMENT`-Ledger-Eintrag an die Schule in KES, idempotent

## Phase 5 — Frontend (Commit 3, feat(web))
- [x] T050 `core/models.ts` E20-Typen + `api.service.ts` E20-Methoden
- [x] T051 `features/donate/currency-format.spec.ts` + `.ts`
- [x] T052 `features/donate/fx-display.spec.ts` + `.ts`
- [x] T053 `features/donate/method-labels.spec.ts` + `.ts`
- [x] T054 `features/donate/i18n-resolve.spec.ts` + `.ts` (Spiegel des Backend-Kerns)
- [x] T055 `features/donate/localized-donate.page.ts` (Währung/Methode/Labels/FX-Anzeige)
- [x] T056 `features/school-settings/school-currency.page.ts` (lokales Auszahlungskonto)
- [x] T057 Routen in `app.routes.ts` + Per-Path-Gates in `jest.config.js`

## Phase 6 — Verifikation + Docs (Commit 4, docs)
- [x] T060 `test:cov` api + web grün; beide `build` grün; `seed` sauber
- [x] T061 `migrate status` up-to-date; `migrate diff --exit-code` keine Differenz
- [x] T062 `prettier --check` in beiden Apps sauber
- [x] T063 `docs/EPICS-PROGRESS.md` E20-Zeile + Log; E20 als **FERTIG** markiert
