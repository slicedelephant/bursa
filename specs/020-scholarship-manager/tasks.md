# Tasks 020 — Self-Serve Corporate Scholarship Program Manager (E19)

## Phase 0 — Spec-Kit (Commit 1, docs)
- [x] T000 spec.md, plan.md, research.md, data-model.md, contracts/api.md, quickstart.md
- [x] T001 Branch `020-scholarship-manager` von `main`

## Phase 1 — Prisma (Commit 2, feat(api))
- [x] T010 Enums `FieldType`, `ApplicationStatus`, `ScholarStatus`, `AwardTrancheStatus`
- [x] T011 Modelle `ScholarshipProgram`, `ProgramCycle`, `ApplicationForm`, `FormField`
- [x] T012 Modelle `Application`, `ApplicationAnswer`, `ProgramReviewer`, `ReviewScore`
- [x] T013 Modelle `ScholarshipAward`, `ScholarRelationship` + Rückrelationen an
  `CorporateProfile`/`School`/`User`
- [x] T014 Migration `scholarship_manager`; `migrate status` + `migrate diff --exit-code`

## Phase 2 — Pure-Logic (Tests zuerst) (Commit 2, feat(api))
- [x] T020 `scholarship/form-schema.validator.spec.ts` + `.ts` (`validateFormSchema`)
- [x] T021 `scholarship/conditional-logic.spec.ts` + `.ts` (`evaluateVisibility`)
- [x] T022 `scholarship/answer.validator.spec.ts` + `.ts` (`validateAnswers`)
- [x] T023 `scholarship/rubric-aggregator.spec.ts` + `.ts` (`aggregateRubric`)
- [x] T024 `scholarship/award-decision.spec.ts` + `.ts` (`decideAwards`, Ties nach appId)
- [x] T025 `scholarship/conditional-disbursement.spec.ts` + `.ts` (`decideConditionalRelease`)
- [x] T026 `scholarship/scholar-status.spec.ts` + `.ts` (`nextScholarStatus`, injiziertes now)
- [x] T027 `scholarship/program-cycle.spec.ts` + `.ts` (`planRenewal`)
- [x] T028 `scholarship/outcome-aggregator.spec.ts` + `.ts` (`buildProgramOutcome`)
- [x] T029 `scholarship/application-token.spec.ts` + `.ts` (`hashToken`, `isTokenActive`)

## Phase 3 — Service/Controller/Modul (Commit 2, feat(api))
- [x] T030 DTOs (`create-program`, `form-schema`, `submit-application`, `review-score`,
  `decide-awards`, `scholar-status`, `message-scholar`, `renew-program`)
- [x] T031 `scholarship.service.ts` — Programm/Form/Reviewer/Application/Scoring
- [x] T032 `scholarship.service.ts` — Award-Kürung + **Disbursement an die Schule**
  (`createPayout` + `LedgerService.append`) + Conditional-Tranche
- [x] T033 `scholarship.service.ts` — SRM (Status, Messaging E17), Report (E5-PDF/CSV +
  E14-Diversity), Renewal
- [x] T034 `scholarship.controller.ts` (SPONSOR) + `apply.controller.ts` (öffentlich)
- [x] T035 `scholarship.module.ts` + Registrierung in `app.module.ts`

## Phase 4 — Seed (Commit 2, feat(api))
- [x] T040 `clearDatabase()` um E19-Tabellen erweitern (child-first)
- [x] T041 Demo-Programm des Sponsors (Formular, 3 Applications, Reviewer-Scores, 1 Award
  an eine Schule + Conditional-Tranche, 1 SRM-Record, Diversity-Sample), idempotent

## Phase 5 — Frontend (Commit 3, feat(web))
- [x] T050 `core/models.ts` E19-Typen + `api.service.ts` E19-Methoden (Blob-Export)
- [x] T051 `features/scholarship/field-format.spec.ts` + `.ts`
- [x] T052 `features/scholarship/status-format.spec.ts` + `.ts`
- [x] T053 `features/scholarship/apply-visibility.spec.ts` + `.ts` (Spiegel des Backend-Kerns)
- [x] T054 `scholarship-admin.page.ts` (Programm/Branding/Builder/Reviewer)
- [x] T055 `reviewer-console.component.ts` (Rubric-Scoring + Kommentare)
- [x] T056 `award-management.component.ts` (Kürung, Disbursement, Tranche-2)
- [x] T057 `srm-dashboard.component.ts` (Status, Messaging, Report-Export)
- [x] T058 `apply.page.ts` (öffentliches Formular mit Conditional-Sichtbarkeit)
- [x] T059 Routen in `app.routes.ts` + Per-Path-Gates in `jest.config.js`

## Phase 6 — Verifikation + Docs (Commit 4, docs)
- [x] T060 `test:cov` api + web grün; beide `build` grün; `seed` sauber
- [x] T061 `migrate status` up-to-date; `migrate diff --exit-code` keine Differenz
- [x] T062 `prettier --check` in beiden Apps sauber
- [x] T063 `docs/EPICS-PROGRESS.md` E19-Zeile + Log; E19 als **FERTIG** markiert
