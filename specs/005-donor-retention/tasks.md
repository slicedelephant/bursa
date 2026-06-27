# Tasks — 005 Donor Retention Loop (TDD-geordnet)

Tests zuerst (RED), dann Implementierung (GREEN), dann Refactor.

## Phase 1 — Prisma
- [ ] T01 Schema: Enums + RecurringPledge/UpdateSubscription/Notification +
      Donation-Felder + Reverse-Relationen
- [ ] T02 Migration `donor_retention` (committet), `prisma generate`

## Phase 2 — Pure Backend-Utils
- [ ] T03 Test+Impl `donations/contribution.util.ts` (split/Overfunding-Kappung)
- [ ] T04 Test+Impl `donations/tribute.util.ts` (normalize + line)
- [ ] T05 Test+Impl `donations/milestone.util.ts` (crossedMilestones)
- [ ] T06 Test+Impl `notifications/notification-templates.ts` (4 Builder)
- [ ] T07 Test+Impl `recurring/recurring-engine.ts` (addMonth/isDue/due/advance)

## Phase 3 — Auth
- [ ] T08 Test+Impl `auth/optional-jwt-auth.guard.ts`

## Phase 4 — Notifications-Modul
- [ ] T09 Test+Impl `notifications/email-logger.ts`
- [ ] T10 Test+Impl `notifications/notifications.service.ts`
      (notify/subscribe/onDonation/onImpactUpdate/listForUser/markRead/subscriptions)
- [ ] T11 `notifications.controller.ts` + `.module.ts`

## Phase 5 — Recurring-Modul
- [ ] T12 Test+Impl `recurring/recurring.service.ts`
      (create/list/pause/resume/cancel/runDue)
- [ ] T13 `recurring.controller.ts` + `.module.ts` + `dto/create-recurring.dto.ts`

## Phase 6 — Donors-Modul
- [ ] T14 Test+Impl `donors/donors.service.ts` (history/receipt)
- [ ] T15 `donors.controller.ts` + `.module.ts`

## Phase 7 — Donations + Campaigns verdrahten
- [ ] T16 `CardDonationDto` += tributeType/tributeName (`@ValidateIf`)
- [ ] T17 `DonationsService.donateCard(..., donorUserId?)` + Tribute +
      `notifications.onDonation`; Spec erweitern (gated bleibt grün)
- [ ] T18 `DonationsController.card` → `OptionalJwtAuthGuard`; `donations.module`
      importiert NotificationsModule
- [ ] T19 `CampaignsService.postUpdate` → `notifications.onImpactUpdate`;
      `campaigns.module` importiert NotificationsModule; Spec anpassen
- [ ] T20 `app.module.ts`: Notifications/Recurring/Donors-Module

## Phase 8 — Frontend pure Helfer
- [ ] T21 Test+Impl `features/donor/donor-summary.ts`
- [ ] T22 Test+Impl `features/donor/notification-format.ts`
- [ ] T23 Test+Impl `features/donor/tribute-display.ts`

## Phase 9 — Frontend Komponenten + Verdrahtung
- [ ] T24 `core/models.ts` + `core/api.service.ts` (neue Typen + Endpoints)
- [ ] T25 Test+Impl `features/donor/notifications-feed.component.ts`
- [ ] T26 Test+Impl `features/donor/donation-history.component.ts`
- [ ] T27 Test+Impl `features/donor/recurring-list.component.ts`
- [ ] T28 `features/donor/donor.page.ts` + Route `/donor` + `homeForRole()` DONOR
- [ ] T29 `donate-card.component`: Tribute-Felder + Monatlich-Toggle
- [ ] T30 `features/student/impact-update-form.component.ts` + in `student.page`

## Phase 10 — Seed + Gates + Verify
- [ ] T31 Seed: Recurring/Tribute/Notifications/Subscriptions für Demo-Spender
- [ ] T32 Per-Path-80%-Gates (api package.json jest + web jest.config.js)
- [ ] T33 Verify: api test, web test:cov, beide builds grün, Seed läuft

## Bewusste Lücken (nicht blockierend)
- [ ] Echtes Recurring-Billing (Stripe-Mandat) statt Simulation
- [ ] Echter E-Mail-Versand (SMTP) statt geloggter Notification-Zeile
- [ ] Background-Scheduler für automatische Monatsabbuchung
