# Plan — 003 Payments All-or-Nothing

## Ansatz

PaymentProvider-Abstraktion erweitern, Kartenfluss von Sofort-Charge auf
Pledge → Capture umstellen, reine Goal-Logik isolieren (testbar), Frontend-
Goal-Mechanik als eigene Komponente. Mock bleibt Default; Stripe per Factory
hinter Env-Flag.

## Backend (NestJS + Prisma)

1. `payment-provider.interface.ts`: Typen `PledgeResult`, `CaptureInput`;
   Methoden `savePledge`, `captureOnGoalReached`, `payoutToSchool` ergänzen
   (Altmethoden bleiben — keine Domänenbrüche).
2. `mock-payment.provider.ts`: neue Methoden deterministisch (.13-Sentinel).
3. `stripe-payment.provider.ts` (neu): echtes SDK lazy via `require`; SetupIntent
   / off_session PaymentIntent / Transfer. Fällt nie hart, nur über Factory aktiv.
4. `payment-provider.factory.ts` (neu): `shouldUseStripe(env)` +
   `createPaymentProvider(env)` mit Mock-Fallback.
5. `payments.module.ts`: `useFactory` mit `ConfigService` (Env-Flag).
6. `pledge-engine.ts` (neu, pur): `isGoalReached`, `remainingCents`,
   `pledgeOutcome`, `summarizeCapture`.
7. `donations.service.ts`: `donateCard` → Pledge-Fluss; `captureCampaign`
   (off_session Capture aller Pledges, CAPTURED, SYSTEM-Update, Beleg).
8. Prisma: DonationStatus +PLEDGED/CAPTURED/EXPIRED; Donation +pledgeRef
   +capturedAt. Migration `payments_allornothing`.
9. Campaign-Detail/Liste: PLEDGED/CAPTURED-Spenden mit anzeigen.

## Frontend (Angular 20, Signals)

1. `goal-math.ts` (neu, pur): Restsumme, Prozent, Meilenstein, Deadline-Info.
2. `campaign-progress.component.ts` (neu): Balken, Restsumme, 80/90%-Meilenstein,
   Deadline-Countdown, All-or-Nothing-Hinweis.
3. `campaign.page.ts`: Komponente in die Sticky-Sidebar einsetzen.
4. `models.ts`: `DonationResult.capture?` ergänzen.

## Tests (TDD, ≥80% neuer Code)

- Backend Per-Path-Gates: `pledge-engine.ts`, `donations.service.ts`,
  `mock-payment.provider.ts`, `payment-provider.factory.ts`.
- Frontend Per-Path-Gates: `goal-math.ts`, `campaign-progress.component.ts`.

## Constitution-Check

- Immutabilität: pure Helfer geben neue Objekte zurück (`summarizeCapture` via
  reduce, kein Mutieren der Inputs — getestet).
- Provider-Abstraktion: Stripe/Mock über dasselbe Interface, Domänencode kennt
  keine Stripe-Internas.
- Boundary-Validation + `{success,data}`-Envelope: unverändert über bestehende
  DTOs/Interceptor; Money-Invarianten in `loadDonatable`.
- Trust-by-Design: kein Geldfluss zwischen PLEDGED und CAPTURED (Invariante).

## Complexity Tracking

Keine Abweichung von der Constitution. `stripe` als optionale, lazy geladene
Dependency statt harter Abhängigkeit, um Build/Tests ohne Keys grün zu halten.
