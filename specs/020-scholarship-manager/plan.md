# Plan 020 — Self-Serve Corporate Scholarship Program Manager (E19)

## Wiederverwendung (kein Neubau)

- **E2/E12 Payment + Ledger** (`apps/api/src/payments/payment-provider.interface.ts`,
  `apps/api/src/ledger/ledger.service.ts`): Award-Auszahlung nutzt
  `PaymentProvider.createPayout({ amountCents, currency, schoolName, accountRef, ... })`
  — das targetet die **Schule**, nie den Scholar. Jede Auszahlung wird über
  `LedgerService.append({ entryType: 'DISBURSEMENT', schoolId, amountCents, reason,
  refType: 'scholarship_award', refId }, now)` in den **append-only** Ledger geschrieben.
  Kein zweiter Payout-Pfad, keine zweite Ledger-Implementierung.
- **E11 KYC** (`apps/api/src/kyc/kyc.service.ts`): Scholar-Verifizierung ruft
  `KycService.startCase(userId, admissionRecordId?)` — die bestehende Verification-Pipeline,
  nicht neu gebaut. Der Award setzt eine E8-verifizierte Schule (`payoutVerified`) voraus.
- **E5 Corporate Utils** (`apps/api/src/corporate/pdf.util.ts`,
  `apps/api/src/corporate/esg.util.ts`): Impact-Report-PDF nutzt `buildSimplePdf(title,
  lines)`; CSV im `toCsv`-Stil (RFC-4180-Escaping). Kein zweiter PDF-/CSV-Renderer.
- **E14 ESG/Diversity** (`apps/api/src/esg/diversity-aggregator.ts`): Die Diversity-Metriken
  des Impact-Reports kommen aus `aggregateDiversity(profiles, refYear)` — kein zweiter
  Diversity-Kern. `ScholarshipProgram` liest die Diversity-Felder aus `StudentProfile`
  (`gender`, `birthYear`, `firstGen`, `country`).
- **E17 Messaging** (`apps/api/src/impact-feed/messaging/`): Scholar-SMS/E-Mail läuft über
  die bestehende `MessagingProvider`-Naht (`MockMessagingProvider` als Default, Symbol-DI-
  Token, env-gegatete Factory). E19 fügt keine neue Messaging-Infra hinzu, es konsumiert sie.
- **E8 Schools + Token-Muster** (`apps/api/src/schools/`): Award-Ziel ist eine verifizierte
  `School`. Application-/Status-Links nutzen das gehashte Token-Muster (`tokenHash`, nie
  Roh-Token in der DB) wie E8/E11/E14.

## Application-Token- & Messaging-Naht (Kern-Design)

- **Token:** Public-Application- und Status-Links laufen über einen SHA-256-gehashten
  Token. Reine Helfer in `application-token.ts` (`hashToken`, `isTokenActive({ expiresAt,
  revokedAt, now })`), Roh-Token nur einmal an den Client, in der DB nur `tokenHash`.
- **Messaging:** `ScholarshipService` injiziert `@Inject(MESSAGING_PROVIDER) messaging:
  MessagingProvider` (E17). Scholar-Kommunikation baut eine `OutboundMessage` und ruft
  `messaging.send(...)`. Tests injizieren immer `MockMessagingProvider` — kein Netzaufruf.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

Jede Funktion gibt **neue** Objekte zurück, mutiert keine Eingabe, ruft kein I/O.
`now` wird **injiziert** — kein `Date.now()` in der reinen Funktion.

1. `form-schema.validator.ts` — `validateFormSchema(fields)` → `{ valid; errors[] }`
   (eindeutige Keys, SELECT braucht Optionen, Gewicht ≥ 0, Conditional-Ref existiert).
2. `conditional-logic.ts` — `evaluateVisibility(fields, answers)` →
   `Record<fieldKey, boolean>` (deterministische `showIf`-Auswertung).
3. `answer.validator.ts` — `validateAnswers({ fields, answers, visibility })` →
   `{ valid; errors[] }` (Pflicht da, Typ passt, SELECT-Wert erlaubt; unsichtbare Felder
   übersprungen).
4. `rubric-aggregator.ts` — `aggregateRubric({ fields, scores })` →
   `{ perField; consensus }` (gewichteter Mittelwert je Feld, 0–100 Konsens-Score).
5. `award-decision.ts` — `decideAwards({ ranked, budgetCents, slots, awardCents })` →
   `{ winners[]; spentCents }` (Ranking + Budget-/Slot-Cutoff, Ties nach `appId`).
6. `conditional-disbursement.ts` — `decideConditionalRelease({ gpa, threshold,
   alreadyReleased })` → `{ decision: 'RELEASE' | 'HELD'; reason }`.
7. `scholar-status.ts` — `nextScholarStatus(current, event)` → nächster Status;
   `isTerminalScholarStatus(s)`; ungültiger Übergang → wirft Domain-Fehler.
8. `program-cycle.ts` — `planRenewal({ cycle, now })` → neuer Cycle (Jahr + 1, Zähler
   zurückgesetzt, Schema-Kopie-Flag).
9. `outcome-aggregator.ts` — `buildProgramOutcome({ scholars })` → Outcome-Verteilung
   (enrolled/graduated/working-Counts, Retention-/Graduation-Rate).
10. `application-token.ts` — `hashToken(raw)`; `isTokenActive({ expiresAt, revokedAt,
    now })` → boolean.

## Service / Controller / Modul

- **`scholarship/scholarship.service.ts`** — orchestriert: Programm/Form CRUD, Application-
  Intake (Token-validiert), Reviewer-Scoring, Award-Kürung + **Disbursement an die Schule**
  (`PaymentProvider.createPayout` + `LedgerService.append`), Conditional-Tranche, SRM-
  Status-Updates + Messaging (E17), Report-Komposition (E5-PDF/CSV + E14-Diversity),
  Renewal. Dünn — die Rechen-Logik liegt in den Kernen. Wirft `DomainException(code, msg,
  status)`; gibt Plain-Data zurück (Envelope kommt vom Interceptor).
- **`scholarship/scholarship.controller.ts`** (SPONSOR, `JwtAuthGuard`+`RolesGuard`,
  `@Roles(Role.SPONSOR)`):
  - `POST /scholarship/programs` (FR-1) — Programm anlegen (Branding, Slug)
  - `GET  /scholarship/programs` / `GET /scholarship/programs/:id`
  - `PUT  /scholarship/programs/:id/form` (FR-2) — Formular-Schema setzen
  - `POST /scholarship/programs/:id/reviewers` — Reviewer einladen (max 10)
  - `GET  /scholarship/programs/:id/applications` — Applications + Konsens-Score
  - `POST /scholarship/applications/:id/scores` (FR-4) — Reviewer-Score abgeben
  - `POST /scholarship/programs/:id/decide` (FR-5) — Gewinner küren
  - `POST /scholarship/awards/:id/disburse` (FR-6) — Auszahlung an die Schule (Tranche 1)
  - `POST /scholarship/awards/:id/release-tranche` (FR-7) — Tranche 2 per GPA-Threshold
  - `GET  /scholarship/programs/:id/scholars` — SRM-Dashboard
  - `PUT  /scholarship/scholars/:id/status` (FR-9) — Scholar-Status-Übergang
  - `POST /scholarship/scholars/:id/message` — Scholar via E17-Messaging kontaktieren
  - `GET  /scholarship/programs/:id/report.csv|.pdf` (FR-10, `@Res()`) — Impact-Report
  - `POST /scholarship/programs/:id/renew` (FR-11) — Renewal-Cycle
- **`scholarship/apply.controller.ts`** (öffentlich, token-gegatet, kein Login):
  - `GET  /apply/:token` — Formular-Schema (mit Conditional-Metadaten) laden
  - `POST /apply/:token` (FR-3, FR-12) — Application einreichen (Answer-validiert)
  - `GET  /apply/:token/status` — Bearbeitungsstand
- **`scholarship/scholarship.module.ts`** — importiert `PaymentsModule`, `LedgerModule`,
  `KycModule`, `SchoolsModule`, `ImpactFeedModule` (Messaging-Reexport bzw. eigener
  `MESSAGING_PROVIDER`-Binding via Factory), `PrismaModule`; in `app.module.ts` registriert.
- **DTOs** (`scholarship/dto/`): `create-program.dto.ts`, `form-schema.dto.ts`,
  `submit-application.dto.ts`, `review-score.dto.ts`, `decide-awards.dto.ts`,
  `scholar-status.dto.ts`, `message-scholar.dto.ts`, `renew-program.dto.ts` — Boundary-
  Validierung (whitelist, coercion off).

## Datenfluss

1. Sponsor legt `ScholarshipProgram` (+ Default-`ProgramCycle`) + `ApplicationForm` an.
2. Kandidat lädt `GET /apply/:token`, sieht Schema + Conditional-Metadaten, reicht via
   `POST /apply/:token` ein → `validateAnswers` + `evaluateVisibility` an der Grenze →
   `Application` + `ApplicationAnswer[]` (Status `SUBMITTED`).
3. Reviewer scoren je Feld → `ReviewScore[]`; `aggregateRubric` liefert Konsens-Score.
4. Owner ruft `POST /decide` → `decideAwards` markiert Gewinner → `ScholarshipAward[]`.
5. `POST /awards/:id/disburse` → `PaymentProvider.createPayout` **an die Schule** →
   `LedgerService.append({ entryType: 'DISBURSEMENT', ... })` → Award trägt `payoutRef`.
6. `POST /awards/:id/release-tranche` → `decideConditionalRelease` prüft GPA-Threshold →
   bei `RELEASE` erneut Payout **an die Schule** + Ledger-Append.
7. SRM: Status-Übergänge (`nextScholarStatus`), Messaging (E17), Report (E5-PDF/CSV +
   E14-Diversity), Renewal (`planRenewal`).

## Constitution-Checks

- **II Geld an die Schule:** Award-Disbursement geht ausschließlich über
  `PaymentProvider.createPayout` mit `schoolName`/`accountRef` der verifizierten Schule.
  Kein Feld, kein Pfad zahlt an den Scholar. Jede Bewegung ist auditierbar (Ledger-Append).
- **III Provider-Abstraktion:** Payment über `PAYMENT_PROVIDER`-Symbol (Mock-Default),
  Messaging über `MESSAGING_PROVIDER`-Symbol (Mock-Default). Real-Provider swappbar.
- **IV Immutability/kleine Module:** reine Kerne geben neue Objekte zurück; Ledger ist
  append-only; Dateien 200–400 Zeilen, nach Feature organisiert (`scholarship/`).
- **V Boundary-Validierung:** DTOs + `class-validator`; Invarianten vor der Mutation
  (Schule verifiziert, Award nicht doppelt ausgezahlt, Reviewer ≤ 10); `{success,data,error}`.

## Frontend (Angular)

- `features/scholarship/scholarship-admin.page.ts` (SPONSOR) — Programm anlegen/branden,
  Application-Builder (Feld-Liste), Reviewer-Verwaltung.
- `features/scholarship/reviewer-console.component.ts` — Rubric-Scoring + Kommentare.
- `features/scholarship/award-management.component.ts` — Gewinner-Kürung, Disbursement-
  Status, Tranche-2-Release.
- `features/scholarship/srm-dashboard.component.ts` — Scholar-Status, Milestones,
  Messaging, Impact-Report-Export.
- `features/scholarship/apply.page.ts` (öffentlich, Token-Route) — Bewerbungsformular mit
  Conditional-Sichtbarkeit.
- Reine Helfer mit 80%-Gate: `field-format.ts` (Feld-Typ-Labels, Rubric-Anzeige),
  `status-format.ts` (Scholar-Status-Labels + Badge-Farben), `apply-visibility.ts`
  (Client-seitige `showIf`-Auswertung, spiegelt den Backend-Kern).
- Typen in `core/models.ts` (`// ---- E19: … ----`), Service-Methoden in `api.service.ts`
  (`// ---- Scholarship Program Manager (E19) ----`), CSV/PDF-Export via `responseType:
  'blob'`, Routen in `app.routes.ts` (`/scholarship` SPONSOR-gegatet, `/apply/:token`
  öffentlich).

## Prisma

Neue Modelle: `ScholarshipProgram`, `ApplicationForm`, `FormField`, `Application`,
`ApplicationAnswer`, `ProgramReviewer`, `ReviewScore`, `ScholarshipAward`,
`ScholarRelationship`, `ProgramCycle`. Neue Enums: `FieldType`, `ApplicationStatus`,
`ScholarStatus`, `AwardTrancheStatus`. Relationen zu `CorporateProfile`, `User`, `School`,
`Campaign?` (optional), `Payout`/`LedgerEntry` referenziert über `refType`/`refId` (lose
Kopplung, kein FK auf den Ledger nötig). Geld als `Int`-Cents. IDs `cuid()`.
Migration: `scholarship_manager`.

## Verifikation

- `npm --prefix apps/api run test:cov` grün (neue Kerne per-path 80%).
- `npm --prefix apps/web run test:cov` grün (neue Helfer + Komponenten per-path 80%).
- `npm --prefix apps/api run build` + `npm --prefix apps/web run build` grün.
- `npm --prefix apps/api run seed` sauber (idempotent, gebrandetes Demo-Programm).
- `npx prisma migrate status` → up to date; `migrate diff --exit-code` → keine Differenz.
- `prettier --check` in beiden Apps sauber.
