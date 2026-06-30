# Plan 012 — Automated KYC & Verification Pipeline (E11)

## Constitution Check

- **I Spec-Driven:** Diese Artefakte (spec/plan/research/data-model/contracts/quickstart/tasks)
  vor der Implementierung. ✓
- **II Trust & Verification by Design:** Verifikation ist der Kern; Geld weiterhin nur an die
  Schule. Verifikations-Status blockiert keinen geprüften Money-Pfad, ergänzt ihn. ✓
- **III Provider-Abstraktion:** Identität + AML hinter Symbol-Token-Interfaces, Mock-Default,
  echte Skeletons env-gated — exakt wie `PaymentProvider`. ✓
- **IV Immutability & kleine Module:** reine Cores ohne Mutation; Dateien 200-400 Zeilen. ✓
- **V Validate at Boundary:** DTOs mit class-validator; State-Checks vor Mutation; Envelope. ✓
- **VI Privacy & Security:** Audit über E6 (PII-redigiert); Provider-Keys serverseitig; keine
  PII in Logs. ✓

## Architektur-Überblick

```
apps/api/src/kyc/
  // --- reine Cores (Per-Path-80%-Gate, je .spec.ts) ---
  liveness-result.ts          // Confidence-Schwelle → pass/fail
  name-match.ts               // Levenshtein-Ähnlichkeit → 0-100 + matched
  sanctioned-country.ts       // OFAC/Country-Check (baut auf E9-Liste)
  aml-decision.ts             // CLEAR / HIT / BLOCKED aus Betrag+Land+Treffer
  risk-score.ts               // geo + income + accreditation → 0-100 + Band
  verification-state.ts       // State-Machine + Review-Queue-Ableitung
  case-view.ts                // reine DB-Row → View-Mapper (pur)

  // --- Provider-Seams (dünn) ---
  identity-verification.provider.interface.ts   // + IDENTITY_VERIFICATION_PROVIDER Symbol
  mock-identity-verification.provider.ts        // deterministisch, Default
  persona-identity.provider.ts                  // echtes Skeleton (fetch), nie im Test
  identity-provider.factory.ts                  // KYC_PROVIDER=mock|persona

  aml-screening.provider.interface.ts           // + AML_SCREENING_PROVIDER Symbol
  mock-aml-screening.provider.ts                // deterministisch, Default
  sumsub-aml.provider.ts                        // echtes Skeleton (fetch), nie im Test
  aml-provider.factory.ts                       // AML_PROVIDER=mock|sumsub

  // --- Services / Controller / DTOs ---
  kyc.service.ts              // orchestriert Schritte, schreibt DB, auditiert (E6)
  kyc-review.service.ts       // Manual-Review-Queue + Operator-Decision + Dashboard
  kyc.controller.ts          // Student-Endpunkte
  kyc-aml.controller.ts      // Sponsor-AML-Endpunkt
  kyc-review.controller.ts   // Operator-Endpunkte
  kyc.module.ts              // bindet Tokens; importiert SecurityModule (E6) + SchoolsModule (E8)
  dto/*.dto.ts
```

## Wiederverwendung (kein Neubau)

- **E6 `AuditService`** (via `SecurityModule`-Import) — jede Entscheidung wird auditiert.
- **E8 `AdmissionRecord`** + **`RegistrarProvider`** — Namens-/Programm-Quelle für den Dokument-
  Abgleich; optionale zweite Registrar-Quelle. `SchoolsModule` wird importiert; der Mock-Registrar
  wird lokal gebunden (wie in `SchoolsModule`).
- **E9 `SANCTIONED_COUNTRIES`** — Single Source der Sanktionsliste; `sanctioned-country.ts`
  re-exportiert/erweitert sie statt ein zweites Set anzulegen.
- **E9 `RiskLevel`-Enum** + Band-Grenzen — wiederverwendet im Risk-Score.
- **`PaymentProvider`-Muster** — 1:1 für die beiden neuen Provider-Seams.

## Datenfluss (Student)

1. `POST /kyc/cases` → `VerificationCase(STARTED)`.
2. `POST /kyc/cases/:id/liveness` → Identity-Provider liefert Liveness; `liveness-result.ts`
   bewertet; State → `LIVENESS_PASSED` oder `MANUAL_REVIEW`. Audit.
3. `POST /kyc/cases/:id/document` → Identity-Provider liefert OCR-Felder; `name-match.ts`
   vergleicht mit Admission; optional Registrar-Lookup; State → `DOCUMENT_VERIFIED` oder
   `MANUAL_REVIEW`. `risk-score.ts` aggregiert. Bei vollständigem Pass → `VERIFIED`. Audit.

## Datenfluss (Sponsor)

1. `POST /kyc/aml/screen` → unter Schwelle: `CLEAR` ohne Call. Über Schwelle: AML-Provider +
   `sanctioned-country.ts` + `aml-decision.ts` → `CLEAR`/`HIT`/`BLOCKED`. State entsprechend.
   Audit.

## Datenfluss (Operator)

1. `GET /kyc/review/queue` → PENDING-Fälle nach Risk sortiert.
2. `POST /kyc/review/:id/decide` → `verification-state.ts` setzt `APPROVED`/`REJECTED`
   (nur aus PENDING). Audit.

## Test-Strategie (TDD, Per-Path-80%)

Jeder reine Core bekommt zuerst `.spec.ts`, dann Implementierung. Provider-Mocks bekommen
`.spec.ts` (deterministisch, kein Netz). Services werden mit gemocktem Prisma + gemockten
Providern getestet. Skeletons (Persona/Sumsub) und Controller bleiben ohne Gate (kompilieren,
nicht gegated — wie Stripe/Claude-Skeleton). Per-Path-Gates für alle neuen `kyc/*`-Cores +
Mocks + Factories + Services in `apps/api/package.json`.

## Frontend (apps/web)

- `features/student/kyc-verification.component.ts` — geführter Flow (Liveness → Dokument →
  Status), eingebunden in die Student-Page. Pure Helfer `kyc-status.ts` (Status-Label/Farbe/
  Fortschritt) + `.spec.ts`.
- `features/admin/kyc/kyc-review.page.ts` + `kyc-review-queue.component.ts` — Operator-Queue,
  Decision-Buttons. Pure Helfer `kyc-review-format.ts` + `.spec.ts`.
- `features/sponsor` — AML-Status-Anzeige (kleiner Helfer `aml-status.ts` + `.spec.ts`).
- `core/api.service.ts` + `core/models.ts` um die KYC-Calls/Typen ergänzt.
- `app.routes.ts`: `admin/kyc` (ADMIN). Per-Path-Web-Gates für die puren Helfer + Komponenten.

## Risiken

- **Prisma migrate dev non-interaktiv** evtl. blockiert → Fallback via `migrate diff --script`
  + `migrate deploy` (siehe quickstart).
- **Coverage-Gates**: Cores klein und vollständig getestet halten; Controller/Skeletons nicht
  gaten.
