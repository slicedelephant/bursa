# Tasks 015 — ESG/CSR Audit-Trail & CSRD-Compliance-Reporting (E14)

TDD-geordnet: Tests vor Implementierung. Jede neue pure-logic-Datei bekommt ein
Per-Path-80%-Gate (`apps/api/package.json` bzw. `apps/web/jest.config.js`).

## Phase 0 — Branch + Spec-Kit (Commit 1)
- [x] T000 `git checkout -b 015-csrd-reporting` von `main`
- [x] T001 spec.md, research.md, plan.md, data-model.md, contracts/api.md, quickstart.md, tasks.md

## Phase 1 — Prisma (Commit 2, Teil von feat(api))
- [ ] T010 schema.prisma: Enums `EsgCategory`, `ReportStandard`, `Gender`;
      Modelle `EsgTag`, `EsgReport`, `AuditorAccessGrant`; `StudentProfile` += diversity;
      `LedgerEntry` += `esgTag` Back-Relation; `User` += Back-Relations
- [ ] T011 Migration `csrd_reporting` (migrate diff → migrate deploy → migrate status)
- [ ] T012 `prisma generate`

## Phase 2 — Pure Kerne (Tests zuerst) (Commit 2)
- [ ] T020 esg-category.spec.ts → esg-category.ts (validieren/parsen, Label, Verteilung)
- [ ] T021 age-band.spec.ts → age-band.ts (birthYear+refYear → Band, null-safe)
- [ ] T022 diversity-aggregator.spec.ts → diversity-aggregator.ts (Gender/Land/Band/firstGen/Count)
- [ ] T023 data-quality.spec.ts → data-quality.ts (captured/total → pct, Gesamtnote, collectMore)
- [ ] T024 esg-aggregate.spec.ts → esg-aggregate.ts (Ledger+Profile+Tags → EsgAggregate)
- [ ] T025 esg-standard-mapper.spec.ts → esg-standard-mapper.ts (GRI/CSRD/SASB/SDG-Mapping)
- [ ] T026 audit-annotation.spec.ts → audit-annotation.ts (Fußnoten + CSV/PDF-Zeilen via E5)
- [ ] T027 esg-trend.spec.ts → esg-trend.ts (Year-over-Year + Delta)
- [ ] T028 auditor-access-token.spec.ts → auditor-access-token.ts (create/validate, E8-Muster)

## Phase 3 — Service / Controller / Modul (Commit 2)
- [ ] T030 esg.service.spec.ts → esg.service.ts (Ledger read-only, Tags, Reports, Grants, Exporte)
- [ ] T031 dto/: tag-entry.dto.ts, diversity.dto.ts, create-grant.dto.ts, generate-report.dto.ts
- [ ] T032 esg-admin.controller.ts (ADMIN) + audit-portal.controller.ts (öffentlich, token)
- [ ] T033 esg.module.ts: importiert LedgerModule + SecurityModule + ObservabilityModule;
      in app.module.ts registrieren
- [ ] T034 apps/api/package.json: Per-Path-Gates für alle neuen esg/* Kerne + Service

## Phase 4 — Seed (Commit 2)
- [ ] T040 seed.ts: ESG-Tags auf bestehende Ledger-Einträge (kein Mutieren!),
      Scholar-Diversity-Demo (gender/birthYear/firstGen), ein erzeugter EsgReport,
      ein Demo-AuditorAccessGrant. Idempotent.

## Phase 5 — Frontend (Commit 3, feat(web))
- [ ] T050 csrd-format.spec.ts → csrd-format.ts (Standard-Labels, Kennzahl-Format)
- [ ] T051 data-quality-format.spec.ts → data-quality-format.ts (Score-Klassen/Hinweise)
- [ ] T052 trend-format.spec.ts → trend-format.ts (Delta-Pfeile/-Klassen)
- [ ] T053 auditor-grant-format.spec.ts → auditor-grant-format.ts (Ablauf/Status-Chips)
- [ ] T054 report-builder.component(.spec).ts (Standard-Picker + Generate + Export)
- [ ] T055 data-quality-panel.component(.spec).ts
- [ ] T056 trend-chart.component(.spec).ts
- [ ] T057 auditor-access-panel.component(.spec).ts
- [ ] T058 csrd.page.ts (ADMIN /admin/csrd) + Route + Nav-Link
- [ ] T059 ApiService + models.ts: CSRD-Calls/Typen; jest.config.js Per-Path-Gates

## Phase 6 — Verify + PR (Commit 4)
- [ ] T060 api test:cov + web test:cov grün; beide build grün; seed sauber
- [ ] T061 prisma migrate status up to date; diff --exit-code "No difference detected"
- [ ] T062 prettier --check clean (beide Apps)
- [ ] T063 EPICS-PROGRESS.md: E14-Sektion + Statustabelle + Log; "FERTIG"
- [ ] T064 push + PR (Base main); DO NOT merge
