# Tasks 014 — Employer Matching Auto-Detection (E13)

TDD-geordnet: Tests vor Implementierung; Per-Path-80% auf allen neuen reinen Dateien.
Commits in logischen Einheiten (Commit 1 Spec, Commit 2 API, Commit 3 Web, Commit 4
Docs).

## Phase 0 — Spec-Kit (Commit 1)
- [x] T001 spec.md (WHY/WHAT/Stories/Entities/Success/Out-of-Scope)
- [x] T002 research.md (Entscheidungen, Wiederverwendung E2/E4/E5)
- [x] T003 data-model.md (Enums + Modelle + Jahres-Balance-Mechanik)
- [x] T004 contracts/api.md (Endpunkte + Views + Error-Codes)
- [x] T005 plan.md (Architektur + Constitution-Check)
- [x] T006 quickstart.md (Migration-Fallback, Demo-Flow, Mock-DB)
- [x] T007 tasks.md (diese Datei)

## Phase 1 — Prisma (Teil von Commit 2)
- [ ] T010 schema.prisma: Enums `MatchClaimStatus`, `EmployerIntegrationLevel`;
      Modelle `EmployerMatchProgram`, `MatchClaim`; User-Felder (employerName/
      employerDomain/matchYear/matchUsedCents) + Rück-Relationen; Donation-Rück-
      Relationen (triggeredClaim/matchClaim)
- [ ] T011 Migration `employer_matching` anwenden (migrate dev oder diff-Fallback);
      migrate status up-to-date + diff "No difference detected"

## Phase 2 — Reine Cores (TDD, Commit 2)
- [ ] T020 email-domain.ts (+ spec): Domain extrahieren/normalisieren, kein `@` → null
- [ ] T021 employer-match-lookup.ts (+ spec): Eligibility (aktiv + minDonation)
- [ ] T022 match-amount.ts (+ spec): Ratio × Spende, Cap durch remainingAnnual, capped-Flag
- [ ] T023 claim-status.ts (+ spec): State-Machine erlaubte Übergänge + Display
- [ ] T024 match-labels.ts (+ spec): EN/DE/FR/ES-Resolver, Fallback EN
- [ ] T025 match-view.ts (+ spec): Programm/Claim/User → Offer/Claim/Balance-View

## Phase 3 — Provider-Seam (Commit 2)
- [ ] T030 employer-match.provider.interface.ts (Symbol + lookupByDomain)
- [ ] T031 mock-employer-match.provider.ts (+ spec): statische ~30-Firmen-DB
- [ ] T032 double-the-donation.provider.ts (env-gated fetch-Skeleton, nie in Tests)
- [ ] T033 employer-match-provider.factory.ts (+ spec): shouldUseDtd + create + Mock-Fallback

## Phase 4 — Service / Controller / Modul (Commit 2)
- [ ] T040 matching.service.ts (+ spec): detect/offer/claim/balance über Prisma+Provider+Cores;
      committeter Match als CORPORATE-Spende (E2-Form, splitContribution-Kappung);
      Jahres-Balance-Verbuchung; reuse buildSimplePdf
- [ ] T041 dto/ (DetectMatchDto, MatchOfferDto, ClaimMatchDto) — Boundary-Validierung
- [ ] T042 matching.controller.ts (/matching-Endpunkte + PDF-Download)
- [ ] T043 matching.module.ts (Global-Provider-Binding) + in app.module.ts registrieren
- [ ] T044 package.json Per-Path-80%-Gates für alle neuen reinen Dateien + Mock + Factory + Service

## Phase 5 — Frontend (Commit 3)
- [ ] T050 match-format.ts (+ spec): Geld-/Headline-Formatierung
- [ ] T051 employer-label.ts (+ spec): Arbeitgeber-Name + Multi-Language-Label-Auswahl
- [ ] T052 match-offer.component.ts (+ spec): Callout + Claim-CTA im Checkout
- [ ] T053 match-balance.component.ts (+ spec): Balance-Counter im Account
- [ ] T054 claim-history.component.ts (+ spec): Claim-Liste mit Status
- [ ] T055 ApiService + models.ts erweitern; donate-card + donor.page verdrahten
- [ ] T056 jest.config.js Per-Path-80%-Gates für alle neuen reinen Web-Dateien

## Phase 6 — Seed + Verify (Commit 2/3)
- [ ] T060 seed.ts: ~30 EmployerMatchProgram, donor@bursa.test Arbeitgeber + Demo-Claim;
      clearDatabase-Reihenfolge (matchClaim vor donation/user); idempotent
- [ ] T061 Verify: api+web test:cov grün, beide Builds grün, seed clean, migrate
      status/diff sauber, prettier --check sauber

## Phase 7 — Docs + PR (Commit 4)
- [ ] T070 EPICS-PROGRESS.md E13-Abschnitt + Statustabelle
- [ ] T071 PR gegen main (DE-Body, Provider-Design, Endpunkte, Out-of-Scope)
