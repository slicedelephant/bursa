# Tasks — Feature 009 School-Self-Serve-Portal (E8, TDD-geordnet)

Tests ZUERST (RED), dann Implementierung (GREEN), dann Refactor. Pure Kerne mit
80%-Per-Path-Gate. Backend `npm --prefix apps/api test`, Frontend
`npm --prefix apps/web run test:cov`.

## Phase A — Pure Backend-Kerne (höchster Wert, leicht 80%)

- [x] T01 `onboarding-token.spec.ts` → `onboarding-token.ts`: create/hash/validate,
      timing-safe Vergleich, used/expired/mismatch/malformed, injizierbare now+bytes.
- [x] T02 `onboarding-status.spec.ts` → `onboarding-status.ts`: State-Machine
      (start/submit/activate, ungültig wirft), `isPayoutDataComplete`,
      `canApproveCampaigns`, Checklist + ProgressPct.
- [x] T03 `admission-import.spec.ts` → `admission-import.ts`: CSV parse, Header-
      Flexibilität/CRLF, fehlende Spalten, Per-Zeilen-Fehler, Dedupe, leer.
- [x] T04 `payout-status.spec.ts` → `payout-status.ts`: Derivation aus Payout-Row
      bzw. Lifecycle, Label, `isPaidOut`.
- [x] T05 `school-dashboard.spec.ts` → `school-dashboard.ts`: Studierenden-Rows,
      Totals (paid/pending), Geo-Gruppierung+Sortierung, leer, Goal=0.
- [x] T06 `school-webhook-events.spec.ts` → `school-webhook-events.ts`: drei
      Envelope-Builder, occurredAt-Default.

## Phase B — Externe Nähte (Mock-Provider + Factory)

- [x] T07 `mock-e-signature.provider.spec.ts` → `e-signature.provider.interface.ts` +
      `mock-e-signature.provider.ts`: deterministische `agreementRef`, leerer Signer wirft.
- [x] T08 `e-signature.provider.factory.spec.ts` → `e-signature.provider.factory.ts`:
      Default Mock, DocuSign nur bei Flag+Key → Fallback Mock mit Warnung.
- [x] T09 `mock-registrar.provider.spec.ts` → `registrar.provider.interface.ts` +
      `mock-registrar.provider.ts`: erkennt normale Refs, Sentinel `…-UNKNOWN` nicht.

## Phase C — Services (mit Prisma-Mock)

- [x] T10 `school-webhook.service.spec.ts` → `school-webhook.service.ts`:
      persistiert, schluckt Fehler, list().
- [x] T11 `school-onboarding.service.spec.ts` → `school-onboarding.service.ts`:
      savePayout (Transition), signAgreement (incomplete wirft / aktiviert),
      generateLink, getOnboardingByToken (gültig/invalid), completeViaToken.
- [x] T12 `school-admissions.service.spec.ts` → `school-admissions.service.ts`:
      import (upsert/Fehler), list, verify (Registrar ok/nicht), reject, NOT_FOUND.
- [x] T13 `school-campaigns.service.spec.ts` → `school-campaigns.service.ts`:
      listForApproval, approve (LIVE + emit), gate SCHOOL_NOT_ACTIVE, reject, NOT_FOUND.
- [x] T14 `school-portal.service.spec.ts` → `school-portal.service.ts`:
      resolveSchoolId (found/forbidden), getMySchool (IBAN maskiert), dashboard.

## Phase D — Dünne Wiring-Schicht

- [x] T15 DTOs: save-payout · sign-agreement · import-admissions · reject-reason ·
      approve-campaign · complete-onboarding · generate-onboarding-link.
- [x] T16 `school-portal.controller.ts` (SCHOOL_ADMIN), `school-onboarding.controller.ts`
      (public Token), `schools.controller.ts` (+ ADMIN onboarding-link), `schools.module.ts`
      (Provider/Token-Seams), in `app.module.ts` bereits eingehängt.
- [x] T17 `payouts.service.ts`/`payouts.module.ts`: `payout.sent`-Emit fire-and-forget.

## Phase E — Datenbank

- [x] T18 `schema.prisma`: Role.SCHOOL_ADMIN, SchoolOnboardingStatus, School-Felder,
      SchoolAdmin, AdmissionRecord, SchoolOnboardingToken, SchoolWebhookEvent,
      Donation.donorCountry; Migration `school_portal`.
- [x] T19 `seed.ts`: Schul-Admin + ACTIVE-Onboarding der verifizierten Schulen +
      Admission-Records + Webhook-Log + hosted-Link (RSM); lauffähig + idempotent.

## Phase F — Frontend (Per-Path-Gate)

- [x] T20 `onboarding-progress.spec.ts` → `features/school/onboarding-progress.ts`.
- [x] T21 `admission-status.spec.ts` → `features/school/admission-status.ts`.
- [x] T22 `school-dashboard-format.spec.ts` → `features/school/school-dashboard-format.ts`.
- [x] T23 Komponenten: school-dashboard · student-list · payout-form ·
      campaign-approval · webhooks-panel · school.page (gebrandeter Shell) ·
      onboarding.page (hosted Flow).
- [x] T24 Einbindung: `models.ts` (E8-Typen), `api.service.ts` (School-Methoden),
      `auth.service.ts` (SCHOOL_ADMIN→/school), `app.routes.ts` (/school +
      /school/onboarding/:token).

## Phase G — Verify & Gates

- [x] T25 Per-Path-80%-Gates in `apps/api/package.json` (14 Dateien) +
      `apps/web/jest.config.js` (3 Helfer).
- [x] T26 `npm --prefix apps/api test` (440) && `npm --prefix apps/web run test:cov`
      (238) && beide `run build` grün && `npm --prefix apps/api run seed` grün.
- [x] T27 Commit (logische Einheiten), Branch push, `gh pr create` (Base main),
      EPICS-PROGRESS aktualisieren.
