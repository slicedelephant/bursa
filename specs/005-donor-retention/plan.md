# Plan — 005 Donor Retention Loop

## Ansatz

Viele kleine, pure Kerne (Coverage-Rückgrat) plus schlanke Nest-Services
(gemocktes Prisma) und Angular-Hüllen. Retention-Seiteneffekte laufen über einen
injizierten `NotificationsService`-Kollaborator, damit der geldkritische,
gegatete `donations.service.ts` nur minimal wächst. Recurring koppelt NICHT an
den E2-Capture-Pfad (eigene Sofort-Erfolgs-Spende, analog Corporate-SEPA).

## Backend (NestJS + Prisma)

1. **Prisma**: Enums (`TributeType`, `RecurringStatus`, `NotificationType`,
   `NotificationChannel`); Models `RecurringPledge`, `UpdateSubscription`,
   `Notification`; `Donation` += `recurringPledgeId/tributeType/tributeName`;
   Reverse-Relationen an `User`/`Campaign`. Migration `donor_retention`.
2. `donations/contribution.util.ts` (neu, pur): `splitContribution(goal, raised,
   amount)` → `{ amountToGoal, tip }` (Overfunding-Kappung). `DonationsService.split`
   delegiert daran.
3. `donations/tribute.util.ts` (neu, pur): `normalizeTribute({type,name})`
   (gemeinsam-oder-keins, immutabel) + `tributeLine(type,name)`.
4. `donations/milestone.util.ts` (neu, pur): `crossedMilestones(prev,neu,goal)`
   → Teilmenge von [80,90,100]; `isGoalMilestone(p)`.
5. `notifications/notification-templates.ts` (neu, pur): Builder
   `thankYou/milestone/impactUpdate/recurringCharge` → `{type,title,body}`.
6. `auth/optional-jwt-auth.guard.ts` (neu): `AuthGuard('jwt')` mit
   `handleRequest` ohne Throw (User optional).
7. `notifications/email-logger.ts` (neu): persistiert EMAIL-Notifications +
   in-memory-Zähler (kein console.log, kein SMTP).
8. `notifications/notifications.service.ts` (neu): `notify`, `subscribe`,
   `listSubscribers`, `onDonation({donation,campaign,prevRaised,newRaised})`
   (Auto-Abo + Dank + Meilensteine), `onImpactUpdate({campaignId,update})`
   (Fan-out an Abonnenten), `listForUser`, `markRead`, `listSubscriptions`.
9. `notifications/notifications.controller.ts` + `.module.ts` (exportiert
   Service für Donations/Campaigns/Recurring).
10. `recurring/recurring-engine.ts` (neu, pur): `addMonth`, `isDue`,
    `duePledges`, `advance(pledge, charged, now)` (immutabel).
11. `recurring/recurring.service.ts` (neu): `create`, `list`, `pause/resume/
    cancel`, `runDue(donorUserId, now)` (Charge via `PaymentProvider.createCardCharge`,
    Spende + Kampagnen-Hochzählung in tx, `advance`, Notification; nicht spendbare
    Kampagne → CANCELLED).
12. `recurring/recurring.controller.ts`, `.module.ts`, `dto/create-recurring.dto.ts`.
13. `donors/donors.service.ts` (neu): `history` (Donations des Spenders →
    Summary + Zeilen mit Tribute-Line), `receipt` (Ownership-Check).
14. `donors/donors.controller.ts`, `.module.ts`.
15. `donations`: `CardDonationDto` += `tributeType/tributeName` (`@ValidateIf`);
    `DonationsService.donateCard(campaignId, dto, donorUserId?)` setzt
    donorUserId/Tribute, ruft `notifications.onDonation` nach Erfolg; Controller
    nutzt `OptionalJwtAuthGuard`. `donations.module` importiert
    `NotificationsModule`.
16. `campaigns`: `postUpdate` ruft `notifications.onImpactUpdate`; Modul
    importiert `NotificationsModule`. (`CampaignsService`-Konstruktor +Service.)
17. `app.module.ts`: `NotificationsModule`, `RecurringModule`, `DonorsModule`.

## Frontend (Angular 20, Signals)

1. `core/models.ts`: `DonorNotification`, `RecurringPledge`, `DonorHistory`,
   `DonorSummary`, `SubscriptionItem`; `CardDonationDto`-Body += Tribute.
2. `core/api.service.ts`: `donorHistory`, `donorReceipt`, `listNotifications`,
   `markNotificationRead`, `createRecurring`, `listRecurring`,
   `pause/resume/cancelRecurring`, `runRecurring`, `listSubscriptions`.
3. `features/donor/donor-summary.ts` (neu, pur): `summaryStats`, `repeatLabel`.
4. `features/donor/notification-format.ts` (neu, pur): Icon/Label/Akzent je
   `NotificationType`, relative Zeit reuse.
5. `features/donor/tribute-display.ts` (neu, pur): `tributeLine(type,name)`
   (frontend-Spiegel) — gemeinsam genutzt von History + Donate-Card-Preview.
6. `features/donor/notifications-feed.component.ts` (neu): Feed-Liste, ungelesen-
   Markierung, mark-read.
7. `features/donor/donation-history.component.ts` (neu): Tabelle/Liste mit
   Beleg-Button.
8. `features/donor/recurring-list.component.ts` (neu): Pledges + Pause/Cancel +
   "Simulate next charge"-Button.
9. `features/donor/donor.page.ts` (neu, ungegated): Account-Seite, Route
   `/donor` (Rolle DONOR) + Navbar-Verlinkung via `homeForRole()` (DONOR →
   `/donor`).
10. `features/campaign/donate-card.component.ts`: Tribute-Felder (Typ + Name) +
    "Make this monthly"-Toggle (legt bei eingeloggtem DONOR Recurring an).
11. `features/student/impact-update-form.component.ts` (neu): Update-Posten im
    Studi-Dashboard (treibt den Fan-out). In `student.page` eingebunden.

## Tests (TDD, >=80% neuer Code — Per-Path-Gates)

- **Backend gated:** `contribution.util`, `tribute.util`, `milestone.util`,
  `notification-templates`, `recurring-engine`, `notifications.service`,
  `recurring.service`, `donors.service`, `auth/optional-jwt-auth.guard`.
- **Donations.service** bleibt gegated; Spec um donorUserId/Tribute/
  Notifications-Call-Branches erweitert.
- **Frontend gated:** `donor-summary`, `notification-format`, `tribute-display`,
  `notifications-feed.component`, `donation-history.component`,
  `recurring-list.component`.

## Constitution-Check

- **Immutabilität**: pure Builder/Engines geben neue Objekte zurück; Services
  fügen nur Keys hinzu, mutieren keine Inputs. Getestet.
- **Kleine Module**: jede neue Datei < ~250 Zeilen, ein Zweck.
- **PaymentProvider-Abstraktion**: Recurring nutzt ausschließlich
  `PaymentProvider.createCardCharge` — kein direkter Stripe/Mock-Zugriff im
  Domänencode. Tauschbar.
- **Boundary-Validation + Envelope**: Tribute & Recurring-DTOs am Boundary
  validiert; bestehender Interceptor/Filter unverändert.
- **Trust-by-Design**: kein Geld vor Zielerreichung im AoN-Pfad; Recurring ist
  ein separater Sofort-Charge-Pfad (wie SEPA), berührt Capture nicht. E-Mail nie
  echt versandt.

## Complexity Tracking

Bewusste Abweichungen (mit einfacherer, verworfener Alternative):
- **Recurring als eigener Sofort-Charge-Pfad** statt Wiederverwendung der
  AoN-Pledge-Engine — vermeidet Kopplung an die Capture-Logik (Risiko fürs
  geldkritische E2). Einfachere Alternative (Recurring als PLEDGE) verworfen,
  weil sie Capture/Deadline-Semantik mit monatlichem Billing vermischt.
- **Kein Scheduler/Cron** — Lauf per Endpoint (`/recurring/run`). Einfacher,
  demoable, keine neue Infra (Constitution Infra-Default).
