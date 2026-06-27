# Tasks — 003 Payments All-or-Nothing (TDD-geordnet)

Tests zuerst (RED), dann Implementierung (GREEN), dann Refactor.

## Phase 1 — Pure Goal/Pledge-Logik (Backend)
- [x] T01 Test `pledge-engine.spec.ts` (isGoalReached, remainingCents, pledgeOutcome, summarizeCapture, Immutabilität)
- [x] T02 Impl `pledge-engine.ts` (pur)

## Phase 2 — Provider-Abstraktion
- [x] T03 Test `mock-payment.provider.spec.ts` erweitern (savePledge/capture/payout, .13-Sentinel)
- [x] T04 Interface erweitern (`PledgeResult`, `CaptureInput`, neue Methoden)
- [x] T05 Impl `mock-payment.provider.ts`
- [x] T06 Impl `stripe-payment.provider.ts` (lazy SDK, SetupIntent/off_session/Transfer)
- [x] T07 Test `payment-provider.factory.spec.ts` (shouldUseStripe, Mock-Default, Fallback)
- [x] T08 Impl `payment-provider.factory.ts` + `payments.module.ts` useFactory

## Phase 3 — Prisma
- [x] T09 Schema: DonationStatus +PLEDGED/CAPTURED/EXPIRED; Donation +pledgeRef/+capturedAt
- [x] T10 Migration `payments_allornothing` (committet)

## Phase 4 — Domänenfluss
- [x] T11 Test `donations.service.spec.ts` (Pledge < Ziel, Capture bei Ziel, Pledge-FAIL,
      SEPA happy/fail/no-profile/funded, captureCampaign skip/failed, not-live/over-funded)
- [x] T12 Impl `donateCard` → Pledge-Fluss + `captureCampaign`
- [x] T13 Campaign-Detail/Liste: PLEDGED/CAPTURED mit anzeigen

## Phase 5 — Frontend Goal-Mechanik
- [x] T14 Test `goal-math.spec.ts` (Restsumme, Prozent, Meilenstein 80/90, Deadline)
- [x] T15 Impl `goal-math.ts`
- [x] T16 Test `campaign-progress.component.spec.ts` (Restsumme, 80/90, funded, Deadline, AoN-Hinweis)
- [x] T17 Impl `campaign-progress.component.ts` + Einbau in `campaign.page.ts`
- [x] T18 `models.ts` `DonationResult.capture?`

## Phase 6 — Gates & Verify
- [x] T19 Per-Path-80%-Gates (api package.json jest + web jest.config.js)
- [x] T20 Verify: api test (50 grün), web test:cov (46 grün, Gates halten), beide builds grün, Seed läuft

## Bewusste Lücken (nicht blockierend)
- [ ] Wallet-Checkout (Apple/Google Pay)
- [ ] off_session-Retry + Re-Auth-Mail-Fallback
- [ ] StripePaymentProvider Integrationstest gegen echtes SDK/Keys
