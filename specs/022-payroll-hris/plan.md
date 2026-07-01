# Plan 022 — Payroll-Match & HRIS-Kopplung (E21)

**Modul:** `apps/api/src/payroll/` · **Frontend:** `apps/web/src/app/features/payroll/` · **Prisma:** 5 neue Modelle + 3 Enums

## Wiederverwendung (kein Neubau)

- **E13 Employer-Matching** (`matching/`) — die reine Match-Rechnung `computeMatch(donationCents,
  matchRatio, remainingCents)` und `remainingAnnualCents(cap, used)` werden **direkt importiert
  und wiederverwendet**. E21 baut die firmenweite Regel (`PayrollMatchRule`) obendrauf, die
  Ratio + Per-Mitarbeiter-Cap liefert; die Rechnung selbst bleibt E13. Kein zweiter Match-Algorithmus.
- **E5 Corporate-Channel** (`corporate/`) — das Payroll-Giving-Programm gehört einem
  `CorporateProfile` (Sponsor). Relation `PayrollGivingProgram.corporateProfileId`.
- **E6 Security** (`security/`) — `AuditService` für den Sync-/Compliance-Trail (PII-redigiert,
  bricht nie den Flow). Der HRIS-Webhook nutzt exakt das E6-`verifyWebhookSignature`-Schema
  (HMAC-SHA256 über `${timestamp}.${rawBody}`, timing-safe, Replay-Fenster), nur mit eigenem
  Header/Secret.
- **E2 Payments + E12 Ledger** (`payments/`, `ledger/`) — die gematchte Payroll-Spende ist eine
  normale `CORPORATE`-Donation auf die Schul-Kampagne; die Auszahlung/Buchung an die SCHULE läuft
  über `PaymentProvider` und wird als append-only `LedgerEntry` festgehalten. Kein neuer Payout-Pfad.

## Provider-Seam (Kern-Design)

- **`EmployeeDataProvider`** (`payroll/employee-data.provider.interface.ts`) — der einzige Seam
  zwischen Domäne und jedem HRIS. Methoden: `listEmployees(connectionRef)` → Sample-Mitarbeiter
  (Employee-ID, Salary-Band, Payroll-Cycle, Pre-Tax-Eligibility). Read-only.
- **Mock-Default:** `MockEmployeeDataProvider` — deterministische Sample-Mitarbeiter, keine
  Netzwerk-Calls. Real-Skeletons `AdpEmployeeDataProvider` / `WorkdayEmployeeDataProvider`
  kompilieren, werfen aber ohne Credentials und werden nie in Tests ausgeführt.
- **Factory:** `createEmployeeDataProvider(env)` — Symbol-DI `EMPLOYEE_DATA_PROVIDER`, Default
  `mock`, ADP nur wenn `HRIS_PROVIDER=adp` **und** `ADP_CLIENT_ID`/`ADP_CLIENT_SECRET` gesetzt.
  Fällt bei Fehler auf Mock zurück. Spiegelt exakt `createPaymentProvider` / `createEmployerMatchProvider`.

## Reusable Pure-Logic (TDD, je `.spec.ts` + Per-Path-80%-Gate)

- **`oauth-scope-validator.ts`** — prüft, dass ein Scope-Satz read-only ist (Write/Payroll-Write
  → invalid). Reiner Boolean + Grund. FR-4.
- **`payroll-cycle.ts`** — aus Payroll-Cycle + injiziertem `now` reine Entscheidung, ob in dieser
  Periode eine Deduction fällig ist + nächstes Fälligkeitsdatum. FR-6. `now` injiziert.
- **`payroll-deduction.ts`** — minor-unit-sichere Deduction (integer cents), optional pre-tax
  Prozent-Abschlag, nie negativ, nie über dem Beitrag. FR-7.
- **`employee-eligibility.ts`** — resolver: aus Salary-Band + Pre-Tax-Eligibility + aktivem
  Programm entscheiden, ob ein Mitarbeiter für Payroll-Giving berechtigt ist.
- **`match-rule.ts`** — die firmenweite Regel auf E13 angewandt: nimmt `PayrollMatchRule`
  (Ratio, Per-Mitarbeiter-Cap) + verbrauchtes Budget, ruft E13 `computeMatch` auf, gibt die
  gedeckelte Match-Berechnung + neuen Balance-Stand zurück. FR-2/FR-5.
- **`sync-log.ts`** — baut den Sync-/Compliance-Trail-Datensatz (Provider, Scopes, Anzahl
  Mitarbeiter, Zeitstempel) rein zusammen; keine I/O. FR-8.
- **`campaign-summary.ts`** — reine Aggregation einer Payroll-Giving-Campaign (wie viele
  Mitarbeiter, Summe Beiträge, Summe Match, Summe an Schule).

## Service / Controller / Modul

- **`payroll.service.ts`** — dünne Orchestrierung über den reinen Kernen + reused Infra:
  `connectHris` (Scope-Prüfung → `HrisConnection` + Audit), `syncEmployees` (Provider →
  `EmployeePayrollProfile`s + Audit), `configureRule` (`PayrollMatchRule` upsert), `activateEmployee`
  (Opt-in), `runCampaign` (für jeden aktivierten Mitarbeiter: E13-Match → gematchte Donation auf
  die Schul-Kampagne → Ledger-Trail → `PayrollContribution` → Payroll-Deduction-Line-Item mock),
  `complianceTrail` (Audit-Liste), `applyWebhook` (signiert). Money immer an die Schule.
- **`payroll.controller.ts`** — `@Controller('payroll')`. HRIS-Connect/Sync/Rule/Campaign/Trail
  sind `SPONSOR`/`ADMIN` (RolesGuard); Employee-Opt-in ist DONOR/eingeloggt; der Webhook läuft
  über den `HrisWebhookGuard` (rawBody, Signatur).
- **`payroll.module.ts`** — importiert `LedgerModule`, `SecurityModule` (AuditService),
  `PaymentsModule` (global). Bindet `EMPLOYEE_DATA_PROVIDER` per env-gated Factory. Spiegelt `FxModule`.
- **`hris-webhook.guard.ts`** — E6-Signatur-Guard mit eigenem Header/Secret.

## Datenfluss

1. **Connect:** Sponsor-Admin ruft `POST /payroll/connect` mit Provider + Scopes. Scopes werden
   read-only-validiert (`oauth-scope-validator`). Bei OK: `HrisConnection` (Status `CONNECTED`)
   + Audit `payroll.hris.connect`.
2. **Sync:** `POST /payroll/sync` → `EmployeeDataProvider.listEmployees` → pro Mitarbeiter
   `EmployeePayrollProfile` upsert (eligibility-resolver) + Audit `payroll.hris.sync` +
   `sync-log`-Datensatz.
3. **Rule:** `POST /payroll/rule` → `PayrollMatchRule` (Ratio, Per-Mitarbeiter-Cap).
4. **Opt-in:** `POST /payroll/activate` (Mitarbeiter) → Profil `active=true`.
5. **Campaign:** `POST /payroll/campaign` → für jeden aktiven Mitarbeiter: `match-rule` (E13
   `computeMatch` mit Cap) → gematchte `CORPORATE`-Donation auf die Schul-Kampagne →
   `campaign.raisedCents += match` → `PayrollContribution` → Ledger-`DONATION` an die Schule →
   Mitarbeiter-Balance += match → Payroll-Deduction-Line-Item (mock ref). Audit `payroll.campaign.run`.
6. **Trail:** `GET /payroll/trail` → E6-Audit-Liste (`payroll.*`).

## Constitution-Checks

- **II Geld an die Schule:** Jede gematchte Payroll-Spende wird als `CORPORATE`-Donation auf die
  Schul-Kampagne gebucht und über den E2-Pfad ausgezahlt/als `LedgerEntry` (Schule) festgehalten.
  Kein Feld, kein Pfad zahlt an einen Mitarbeiter/Studierenden. Payroll ist reine Donor-Finanzierung.
- **III Provider-Abstraktion:** HRIS ausschließlich über `EMPLOYEE_DATA_PROVIDER`-Symbol
  (Mock-Default), Payout über `PAYMENT_PROVIDER` (E2). Real-ADP/Workday swappbar ohne Domänen-Änderung.
- **IV Immutability/kleine Module:** reine Kerne geben neue Objekte zurück; Ledger append-only;
  Dateien 200–400 Zeilen, nach Feature organisiert (`payroll/`).
- **V Boundary-Validierung:** DTOs + `class-validator`; **Minor-Unit-Korrektheit** vor jeder
  Geld-Mutation (integer-safe, keine Floats); Write-Scopes → `INVALID_SCOPES`; `{success,data,error}`.

## Frontend (Angular)

- **`features/payroll/`** — reine Helper mit Per-Path-Gate (`hris-status.ts`, `payroll-format.ts`,
  `match-rule-preview.ts`, `campaign-summary-format.ts`) + Views (Pages werden nicht gegatet,
  wie E20):
  - `hris-connection.page.ts` — HRIS-Verbindungsstatus + Mock-OAuth-Connect-Flow + Sync-Button.
  - `payroll-dashboard.page.ts` — aktivierte Mitarbeiter, Match-Regel-Config, Campaign-Trigger,
    Compliance-Trail.
  - `payroll-optin.page.ts` — Employee-seitiges Payroll-Giving-Opt-in + verbleibendes Budget.
- **`core/models.ts`** — E21-Typen; **`core/api.service.ts`** — E21-Methoden.
- **`app.routes.ts`** — `payroll/connect` (SPONSOR), `payroll` (SPONSOR), `payroll/optin` (eingeloggt).
- **`jest.config.js`** — Per-Path-Gates für die neuen reinen Helper.

## Prisma

3 Enums (`HrisProvider`, `HrisConnectionStatus`, `PayrollCycle`), 5 Modelle (`HrisConnection`,
`PayrollGivingProgram`, `PayrollMatchRule`, `EmployeePayrollProfile`, `PayrollContribution`).
Relationen zu `CorporateProfile`, `User`, `Campaign`, `School`, `Donation`, `LedgerEntry`.
Migration `payroll_hris` via `prisma migrate diff` → `migrate deploy` (nicht-interaktiv).

## Verifikation

`npm --prefix apps/api run test:cov` + `npm --prefix apps/web run test:cov` + beide `run build` +
`run seed` grün; `prisma migrate status` up-to-date, `migrate diff --exit-code` → "No difference";
`prettier --check` in beiden Apps clean.
