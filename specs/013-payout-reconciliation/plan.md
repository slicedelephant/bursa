# Plan 013 — Payout-Reconciliation & Transparenz-Layer (E12)

## Constitution Check

- **I Spec-Driven:** Diese Artefakte (spec/plan/research/data-model/contracts/quickstart/
  tasks) vor der Implementierung. ✓
- **II Trust & Verification by Design:** Reconciliation belegt, dass das Geld an der
  Schule ankommt; Geld weiterhin nur an die Schule; der geprüfte Geld-Pfad wird nicht
  angefasst (nur gelesen). Das Ledger macht jede Geldbewegung auditierbar. ✓
- **III Provider-Abstraktion:** Bank-Feed hinter Symbol-Token-Interface, Mock-Default,
  echtes Plaid-Skeleton env-gated — exakt wie `PaymentProvider`. ✓
- **IV Immutability & kleine Module:** reine Cores ohne Mutation; das Ledger ist
  **literally append-only** (keine Update-/Delete-API); Dateien 200-400 Zeilen. ✓
- **V Validate at Boundary:** Param-/DTO-Validierung; Schul-Scoping vor jedem Lesezugriff;
  Envelope; Public-Transparency liefert nur Aggregate (keine PII). ✓
- **VI Privacy & Security:** Public-API ohne einzelne Spender; IBAN in der SEPA-Doku
  maskiert; Provider-Keys serverseitig. ✓

## Architektur-Überblick

```
apps/api/src/ledger/                     // wiederverwendbares append-only Primitive (für E14)
  ledger-entry.ts          // pur: Bewegung → kanonischer Eintrag + entryHash
  ledger-hash.ts           // pur: sha256 über kanonische Felder + verifyChain()
  ledger.service.ts        // dünn: NUR append() + read(); KEIN update/delete
  ledger.controller.ts     // GET /school/ledger (SCHOOL_ADMIN, schul-skopiert)
  ledger-view.ts           // pur: DB-Row → LedgerView-Mapper
  ledger.module.ts         // bindet LedgerService; exportiert ihn (E14 nutzt ihn)

apps/api/src/reconciliation/
  // --- reine Cores (Per-Path-80%-Gate, je .spec.ts) ---
  reconciliation-matcher.ts    // Payouts ⟷ Bank-Tx → matched/pending/unmatched
  discrepancy-detector.ts      // Betrags-Abweichung + system-ohne-bank / bank-ohne-system
  stale-payout-alert.ts        // 48h-Entscheidung
  tax-report.ts                // US 1099 / EU SEPA Formatter (+ CSV-Zeilen)
  double-entry.ts              // Debit/Credit + GL-Codes (balanciert)
  transparency-aggregator.ts   // PII-freie Schul-Aggregate
  reconciliation-export.ts     // pure CSV-Builder (Payout-Liste) — reuse cell()
  reconciliation-view.ts       // pure DB-Rows → ReconciliationView-Mapper

  // --- Provider-Seam (dünn) ---
  bank-feed.provider.interface.ts   // + BANK_FEED_PROVIDER Symbol
  mock-bank-feed.provider.ts        // deterministisch, Default, leitet aus Payouts ab
  plaid-bank-feed.provider.ts       // echtes Skeleton (fetch), nie im Test
  bank-feed.factory.ts              // BANK_FEED_PROVIDER=mock|plaid, Mock-Fallback

  // --- Service / Controller / Modul / DTOs ---
  reconciliation.service.ts    // orchestriert: Payouts + Bank-Feed lesen → pure Cores
  reconciliation.controller.ts // GET /school/reconciliation*, Exporte (@Res CSV/PDF)
  transparency.controller.ts   // GET /transparency/schools/:id (öffentlich)
  reconciliation.module.ts     // bindet BANK_FEED_PROVIDER; importiert SchoolsModule (E8) + LedgerModule
```

PDF-Export: **kein** neuer Writer — Import von `buildSimplePdf` aus
`../corporate/pdf.util`.

## Wiederverwendung (kein Neubau)

- **E2 `Payout` / `Donation`** — System-Seite der Reconciliation + Quelle der Ledger-
  DONATION/PAYOUT-Einträge. Nur gelesen; der Geld-Pfad bleibt unangetastet.
- **E5 `buildSimplePdf` (`corporate/pdf.util.ts`)** + **CSV-`cell()`-Muster
  (`corporate/esg.util.ts`)** — direkt für die Exporte wiederverwendet.
- **E8 `SchoolPortalService.resolveSchoolId`** — Schul-Scoping aller School-Admin-Routen;
  `SchoolsModule` wird importiert. Das **E8-Dashboard** wird im Frontend um eine
  Reconciliation-Tab erweitert, nicht geforkt.
- **E8 `school-dashboard.ts` / `payout-status.ts`-Muster** — als Vorbild für die puren
  Aggregations-Cores.

## Datenfluss (School-Admin, Reconciliation)

1. `GET /school/reconciliation` → `resolveSchoolId` → Payouts (mit Kampagne) + Bank-Feed
   (`BankFeedProvider.fetchTransactions(schoolId, since)`) lesen.
2. `reconciliation-matcher` matcht (pur) → Rows mit Status; `discrepancy-detector` flaggt;
   `stale-payout-alert` ermittelt 48h-Alerts (pur).
3. Bank-Transaktionen werden idempotent persistiert (`(provider, externalId)`), ein
   `Reconciliation`-Verlauf wird geschrieben, `reconciliation-view` mappt → `ReconciliationView`.

## Datenfluss (Ledger)

1. Beim Seed (und konzeptionell bei Capture/Payout) schreibt `LedgerService.append` je
   Bewegung einen Eintrag: letzten Eintrag der Schule lesen → `sequence`/`prevHash` →
   `ledger-entry` baut den Eintrag + `entryHash` → `create`.
2. `GET /school/ledger` → `listForSchool` + `verifyChain` → `LedgerView` (inkl.
   `integrity`).

## Datenfluss (Public Transparency)

1. `GET /transparency/schools/:id` (kein Auth) → Donations + Payouts der Schule lesen →
   `transparency-aggregator` (pur) → `TransparencyView` (nur Aggregate, keine PII).

## Test-Strategie (TDD, Per-Path-80%)

Jeder reine Core bekommt zuerst `.spec.ts`, dann Implementierung. Der Mock-Provider
bekommt `.spec.ts` (deterministisch, kein Netz). Services werden mit gemocktem Prisma +
gemocktem Bank-Feed getestet. Das Plaid-Skeleton und die Controller bleiben ohne Gate
(kompilieren, nicht gegated — wie Stripe/Persona/Sumsub-Skeleton). Per-Path-Gates für
alle neuen `ledger/*`- und `reconciliation/*`-Cores + Mock + Factory + Services in
`apps/api/package.json`.

## Frontend (apps/web)

- `features/school/reconciliation-format.ts` (+ `.spec.ts`) — pure Helfer
  (Status-Label/Farbe, Betrags-/Stunden-Format, Tile-Mapping).
- `features/school/reconciliation-panel.component.ts` (+ `.spec.ts`) — Reconciliation-
  Tabelle (matched/unmatched/pending + Discrepancy-Flags), Alerts, Export-Buttons; als
  neue Tab in die bestehende `school.page.ts` eingehängt (E8-Dashboard erweitert).
- `features/transparency/transparency.page.ts` (+ pure `transparency-format.ts` +
  `.spec.ts`) — öffentliche Per-Schul-Transparenz-Seite (Route `/transparency/:schoolId`).
- `core/models.ts` + `core/api.service.ts` um die Reconciliation-/Ledger-/Transparency-
  Calls + Typen ergänzt.
- `app.routes.ts`: öffentliche Route `transparency/:schoolId`. Per-Path-Web-Gates für die
  puren Helfer + Komponenten.

## Risiken

- **Prisma migrate dev non-interaktiv** evtl. blockiert → Fallback via
  `migrate diff --script` + `migrate deploy` (siehe quickstart).
- **Coverage-Gates**: Cores klein und vollständig getestet halten; Controller/Plaid-
  Skeleton nicht gaten.
- **Append-only-Invariante**: die Durchsetzung liegt in der API-Disziplin (kein
  Update/Delete am `LedgerService`) + der Hash-Chain-Verifikation; DB-Trigger sind im
  Prototyp Out-of-Scope.
