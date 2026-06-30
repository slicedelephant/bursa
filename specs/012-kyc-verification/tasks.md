# Tasks 012 — Automated KYC & Verification Pipeline (E11)

TDD: jeder reine Core zuerst `.spec.ts` (RED), dann Implementierung (GREEN). Per-Path-80%-Gate
für alle neuen Cores/Mocks/Factories/Services. Kein Netz in Tests.

## Phase 0 — Spec-Kit (Commit 1)
- [x] T001 spec.md (WHY/WHAT/Stories/Entities/Success/Out-of-Scope)
- [x] T002 research.md (Entscheidungen, Wiederverwendung E6/E8/E9)
- [x] T003 data-model.md (Enums + Modelle + Audit-Reuse)
- [x] T004 contracts/api.md (Endpunkte + Views + Error-Codes)
- [x] T005 plan.md (Architektur + Constitution-Check)
- [x] T006 quickstart.md (Migration-Fallback, Demo-Flow, Sentinels)
- [x] T007 tasks.md (diese Datei)

## Phase 1 — Prisma (Teil von Commit 2)
- [ ] T010 schema.prisma: Enums VerificationSubject, VerificationCaseStatus, ReviewQueueStatus,
      AmlDecision
- [ ] T011 schema.prisma: Modelle VerificationCase, LivenessResult, DocumentVerification,
      AmlScreening; Relationen an User + AdmissionRecord
- [ ] T012 Migration `kyc_verification` (migrate dev oder diff+deploy), generate, status/diff clean

## Phase 2 — Reine Cores (TDD, Commit 2)
- [ ] T020 liveness-result.ts (+ spec): Confidence-Schwelle, NaN-Clamp
- [ ] T021 name-match.ts (+ spec): Levenshtein → 0-100, matched-Flag, leere Eingaben
- [ ] T022 sanctioned-country.ts (+ spec): baut auf E9 SANCTIONED_COUNTRIES, grey-Liste
- [ ] T023 aml-decision.ts (+ spec): Schwelle + Land + Provider-Treffer → CLEAR/HIT/BLOCKED
- [ ] T024 risk-score.ts (+ spec): geo + income + accreditation → 0-100 + Band (E9-RiskLevel)
- [ ] T025 verification-state.ts (+ spec): erlaubte Übergänge + Review-Queue-Ableitung
- [ ] T026 case-view.ts (+ spec): DB-Row → View-Mapper (pur)

## Phase 3 — Provider-Seams (Commit 2)
- [ ] T030 identity-verification.provider.interface.ts (+ Symbol)
- [ ] T031 mock-identity-verification.provider.ts (+ spec): Liveness + OCR, Sentinels
- [ ] T032 persona-identity.provider.ts (Skeleton, fetch, nie im Test)
- [ ] T033 identity-provider.factory.ts (+ spec): KYC_PROVIDER=mock|persona, Mock-Fallback
- [ ] T034 aml-screening.provider.interface.ts (+ Symbol)
- [ ] T035 mock-aml-screening.provider.ts (+ spec): deterministisch
- [ ] T036 sumsub-aml.provider.ts (Skeleton, fetch, nie im Test)
- [ ] T037 aml-provider.factory.ts (+ spec): AML_PROVIDER=mock|sumsub, Mock-Fallback

## Phase 4 — Services / Controller / Modul (Commit 2)
- [ ] T040 dto/*.dto.ts (start-case, liveness, document, aml-screen, review-decide)
- [ ] T041 kyc.service.ts (+ spec): orchestriert Schritte, schreibt DB, auditiert (E6),
      nutzt Admission (E8) + optional Registrar
- [ ] T042 kyc-review.service.ts (+ spec): Queue + Operator-Decision + Dashboard, auditiert
- [ ] T043 kyc.controller.ts (Student), kyc-aml.controller.ts (Sponsor),
      kyc-review.controller.ts (ADMIN)
- [ ] T044 kyc.module.ts: bindet Tokens via Factories; importiert SecurityModule (E6) +
      SchoolsModule (E8); in app.module.ts registrieren
- [ ] T045 apps/api/package.json: Per-Path-Gates für alle neuen kyc/* Cores/Mocks/Factories/Services

## Phase 5 — Frontend (Commit 3)
- [ ] T050 core/models.ts + core/api.service.ts: KYC-Typen + Calls
- [ ] T051 features/student/kyc-status.ts (+ spec) + kyc-verification.component.ts; in Student-Page
- [ ] T052 features/admin/kyc/kyc-review-format.ts (+ spec) + kyc-review-queue.component.ts +
      kyc-review.page.ts
- [ ] T053 features/sponsor/aml-status.ts (+ spec) + AML-Status-Anzeige
- [ ] T054 app.routes.ts: admin/kyc (ADMIN); apps/web jest Per-Path-Gates

## Phase 6 — Seed + Verify (Commit 2/3)
- [ ] T060 prisma/seed.ts: synthetische Fälle (VERIFIED Student, MANUAL_REVIEW OCR-Mismatch,
      Demo-AML HIT), idempotent
- [ ] T061 api test:cov grün; web test:cov grün; beide Builds grün; seed clean;
      migrate status/diff clean; prettier clean

## Phase 7 — Docs + PR (Commit 4)
- [ ] T070 docs/EPICS-PROGRESS.md: E11-Sektion + Status-Zeile FERTIG
- [ ] T071 PR gegen main (deutsche Body), NICHT mergen
