# Tasks 013 — Payout-Reconciliation & Transparenz-Layer (E12)

TDD: jeder reine Core zuerst `.spec.ts` (RED), dann Implementierung (GREEN). Per-Path-80%-
Gate für alle neuen Cores/Mock/Factory/Services. Kein Netz in Tests.

## Phase 0 — Spec-Kit (Commit 1)
- [x] T001 spec.md (WHY/WHAT/Stories/Entities/Success/Out-of-Scope)
- [x] T002 research.md (Entscheidungen, Wiederverwendung E2/E5/E8, Ledger-für-E14)
- [x] T003 data-model.md (Enums + Modelle + Ledger-Hash-Chain)
- [x] T004 contracts/api.md (Endpunkte + Views + Error-Codes)
- [x] T005 plan.md (Architektur + Constitution-Check)
- [x] T006 quickstart.md (Migration-Fallback, Demo-Flow, Sentinels)
- [x] T007 tasks.md (diese Datei)

## Phase 1 — Prisma (Teil von Commit 2)
- [ ] T010 schema.prisma: Enums LedgerEntryType, ReconciliationStatus
- [ ] T011 schema.prisma: Modelle LedgerEntry (append-only), BankTransaction, Reconciliation;
      Rück-Relationen an School, User, Payout
- [ ] T012 Migration `payout_reconciliation` (migrate dev oder diff+deploy), generate,
      status/diff clean

## Phase 2 — Ledger-Primitive (TDD, Commit 2)
- [ ] T020 ledger-hash.ts (+ spec): kanonische Serialisierung, sha256, verifyChain (Sequence-
      Monotonie, prevHash-Verkettung, Hash-Neuberechnung)
- [ ] T021 ledger-entry.ts (+ spec): Bewegung → kanonischer Eintrag + entryHash, immutabel
- [ ] T022 ledger-view.ts (+ spec): DB-Row → LedgerView-Mapper (pur)
- [ ] T023 ledger.service.ts (+ spec): NUR append() + read(); kein update/delete; Sequence/
      prevHash je Schule transaktional
- [ ] T024 ledger.controller.ts (GET /school/ledger, SCHOOL_ADMIN), ledger.module.ts (exportiert
      LedgerService für E14)

## Phase 3 — Reine Reconciliation-Cores (TDD, Commit 2)
- [ ] T030 reconciliation-matcher.ts (+ spec): Payouts ⟷ Bank-Tx → matched/pending/unmatched +
      unmatchedBankTx
- [ ] T031 discrepancy-detector.ts (+ spec): Betrags-Abweichung, system-ohne-bank, bank-ohne-system
- [ ] T032 stale-payout-alert.ts (+ spec): 48h-Entscheidung
- [ ] T033 tax-report.ts (+ spec): US 1099 / EU SEPA Formatter + CSV-Zeilen, IBAN maskiert
- [ ] T034 double-entry.ts (+ spec): Debit/Credit + GL-Codes, balanciert (Summe Debit==Credit)
- [ ] T035 transparency-aggregator.ts (+ spec): PII-freie Aggregate (total raised/paid out,
      avg donation, Geografie)
- [ ] T036 reconciliation-export.ts (+ spec): CSV-Builder Payout-Liste (reuse cell-Escaping)
- [ ] T037 reconciliation-view.ts (+ spec): DB-Rows → ReconciliationView-Mapper

## Phase 4 — Bank-Feed-Seam (Commit 2)
- [ ] T040 bank-feed.provider.interface.ts (+ BANK_FEED_PROVIDER Symbol)
- [ ] T041 mock-bank-feed.provider.ts (+ spec): deterministisch, leitet aus Payouts ab, Sentinels
- [ ] T042 plaid-bank-feed.provider.ts (Skeleton, fetch, nie im Test)
- [ ] T043 bank-feed.factory.ts (+ spec): BANK_FEED_PROVIDER=mock|plaid, Mock-Fallback

## Phase 5 — Services / Controller / Modul (Commit 2)
- [ ] T050 reconciliation.service.ts (+ spec): Payouts + Bank-Feed lesen, pure Cores, Bank-Tx
      idempotent persistieren, Reconciliation-Verlauf schreiben, Exporte zusammenstellen
- [ ] T051 reconciliation.controller.ts (School-Admin, @Res CSV/PDF), transparency.controller.ts
      (öffentlich)
- [ ] T052 reconciliation.module.ts: bindet BANK_FEED_PROVIDER via Factory; importiert
      SchoolsModule (E8) + LedgerModule; in app.module.ts registrieren
- [ ] T053 apps/api/package.json: Per-Path-Gates für alle neuen ledger/* + reconciliation/*
      Cores/Mock/Factory/Services

## Phase 6 — Frontend (Commit 3)
- [ ] T060 core/models.ts + core/api.service.ts: Reconciliation-/Ledger-/Transparency-Typen + Calls
- [ ] T061 features/school/reconciliation-format.ts (+ spec) + reconciliation-panel.component.ts
      (+ spec); als Tab in school.page.ts (E8-Dashboard erweitert)
- [ ] T062 features/transparency/transparency-format.ts (+ spec) + transparency.page.ts
- [ ] T063 app.routes.ts: öffentliche Route transparency/:schoolId; apps/web jest Per-Path-Gates

## Phase 7 — Seed + Verify (Commit 2/3)
- [ ] T070 prisma/seed.ts: Ledger-Einträge (Hash-Chain) für bestehende Spenden/Auszahlungen, eine
      gematchte + eine unmatched/stale Bank-Tx, eine orphan Bank-Tx; idempotent
- [ ] T071 api test:cov grün; web test:cov grün; beide Builds grün; seed clean; migrate
      status/diff clean; prettier clean

## Phase 8 — Docs + PR (Commit 4)
- [ ] T080 docs/EPICS-PROGRESS.md: E12-Sektion + Status-Zeile FERTIG
- [ ] T081 PR gegen main (deutsche Body), NICHT mergen
