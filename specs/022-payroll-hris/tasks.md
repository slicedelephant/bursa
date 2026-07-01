# Tasks 022 — Payroll-Match & HRIS-Kopplung (E21)

## Phase 0 — Spec-Kit (Commit 1, docs)
- [x] T000 spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md
- [x] T001 Branch `022-payroll-hris` von `main`

## Phase 1 — Prisma (Commit 2, feat(api))
- [x] T010 3 Enums (`HrisProvider`, `HrisConnectionStatus`, `PayrollCycle`)
- [x] T011 5 Modelle (`HrisConnection`, `PayrollGivingProgram`, `PayrollMatchRule`,
      `EmployeePayrollProfile`, `PayrollContribution`) + Rück-Relationen an
      `CorporateProfile`/`User`/`Donation`/`Campaign`/`School`
- [x] T012 Migration `payroll_hris` (diff → deploy → status/diff clean)

## Phase 2 — Pure-Logic (Tests zuerst) (Commit 2, feat(api))
- [x] T020 `payroll/oauth-scope-validator.spec.ts` + `.ts` (read-only Enforcement)
- [x] T021 `payroll/payroll-cycle.spec.ts` + `.ts` (Scheduler-Entscheidung, `now` injiziert)
- [x] T022 `payroll/payroll-deduction.spec.ts` + `.ts` (minor-unit + pre-tax)
- [x] T023 `payroll/employee-eligibility.spec.ts` + `.ts` (Eligibility-Resolver)
- [x] T024 `payroll/match-rule.spec.ts` + `.ts` (firmenweite Regel auf E13 `computeMatch`)
- [x] T025 `payroll/sync-log.spec.ts` + `.ts` (Compliance-Trail-Builder)
- [x] T026 `payroll/campaign-summary.spec.ts` + `.ts` (reine Campaign-Aggregation)

## Phase 3 — Provider-Seam + Service/Controller/Modul (Commit 2, feat(api))
- [x] T030 `payroll/employee-data.provider.interface.ts` (+ Symbol `EMPLOYEE_DATA_PROVIDER`)
- [x] T031 `payroll/mock-employee-data.provider.ts` + `.spec.ts` (deterministisch, kein Netz)
- [x] T032 `payroll/adp-employee-data.provider.ts` + `payroll/workday-employee-data.provider.ts`
      (Skeletons, kompilieren, werfen ohne Credentials, nie in Tests)
- [x] T033 `payroll/employee-data.provider.factory.ts` + `.spec.ts` (env-gated, mock-default)
- [x] T034 `payroll/hris-webhook.guard.ts` (E6-Signatur-Muster, eigenes Header/Secret)
- [x] T035 `payroll/dto/payroll.dto.ts` (class-validator)
- [x] T036 `payroll/payroll.service.ts` + `.spec.ts` (Orchestrierung, Money an die Schule)
- [x] T037 `payroll/payroll.controller.ts` + `payroll/payroll.module.ts`
- [x] T038 `payroll.module.ts` in `app.module.ts` registrieren
- [x] T039 Per-Path-80%-Gates in `apps/api/package.json` für alle neuen Dateien

## Phase 4 — Seed (Commit 2, feat(api))
- [x] T040 Seed: ACME-Sponsor Mock-ADP-`HrisConnection` (read-only Scopes), `PayrollGivingProgram`
      + `PayrollMatchRule`, 2 aktivierte Mitarbeiter, 1 gematchte `PayrollContribution` an eine
      Schule (Donation + Ledger + Audit-Trail), idempotent + `clearDatabase`-Reihenfolge

## Phase 5 — Frontend (Commit 3, feat(web))
- [x] T050 `core/models.ts` E21-Typen + `api.service.ts` E21-Methoden
- [x] T051 `features/payroll/hris-status.spec.ts` + `.ts`
- [x] T052 `features/payroll/payroll-format.spec.ts` + `.ts`
- [x] T053 `features/payroll/match-rule-preview.spec.ts` + `.ts`
- [x] T054 `features/payroll/campaign-summary-format.spec.ts` + `.ts`
- [x] T055 `features/payroll/hris-connection.page.ts` (Status + Mock-OAuth-Connect + Sync)
- [x] T056 `features/payroll/payroll-dashboard.page.ts` (Mitarbeiter/Regel/Campaign/Trail)
- [x] T057 `features/payroll/payroll-optin.page.ts` (Employee-Opt-in)
- [x] T058 Routen in `app.routes.ts` + Per-Path-Gates in `jest.config.js`

## Phase 6 — Verifikation + Docs (Commit 4, docs)
- [x] T060 `test:cov` (api + web), `build` (api + web), `seed`, `migrate status`/`diff` grün
- [x] T061 `prettier --check` clean in beiden Apps
- [x] T062 `docs/EPICS-PROGRESS.md` E21-Abschnitt + Status-Tabelle FERTIG
