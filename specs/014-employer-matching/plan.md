# Plan 014 — Employer Matching Auto-Detection (E13)

## Constitution Check

- **I Spec-Driven:** spec/research/data-model/contracts/plan/quickstart/tasks vor
  der Implementierung. ✓
- **II Trust & Verification by Design:** Match-Mittel fließen wie jede Zuwendung an
  die Schule; der geprüfte E2-Geld-Pfad wird nicht angefasst (der committete Match
  ist eine normale CORPORATE-Spende mit derselben Over-Funding-Kappung). Geld an den
  Studierenden wird nie bewegt. ✓
- **III Provider-Abstraktion:** Arbeitgeber-DB hinter `EmployerMatchProvider`-Symbol-
  Token, Mock-Default, echtes DTD-Skeleton env-gated (`EMPLOYER_MATCH_PROVIDER=
  mock|dtd` + `DTD_API_KEY`) — exakt wie `PaymentProvider`/`AmlScreeningProvider`. ✓
- **IV Immutability & kleine Module:** reine Cores ohne Mutation (neue Objekte);
  Dateien 200-400 Zeilen; Organisation nach Feature (`matching/`). ✓
- **V Validate at Boundary:** DTO-Validierung (`class-validator`), E-Mail/Domain am
  Boundary geprüft; Spender-Scoping vor Balance/Dokument; Envelope überall. ✓
- **VI Privacy & Security:** Provider-Keys serverseitig; keine PII im Angebot außer
  dem Arbeitgeber-Namen; Match-Detection persistiert nur bei eingeloggtem DONOR. ✓

## Architektur-Überblick

Neues Feature-Modul `apps/api/src/matching/` neben `donations/` und `donors/`:

- **Reine Cores (gegated, je `.spec.ts`):**
  - `email-domain.ts` — Domain-Extractor/Normalisierer.
  - `employer-match-lookup.ts` — Eligibility-Entscheidung über ein Programm.
  - `match-amount.ts` — Match-Betrag (Ratio × Spende, Cap) + `remainingAnnualCents`.
  - `claim-status.ts` — Status-State-Machine + Display-Helper.
  - `match-labels.ts` — EN/DE/FR/ES-Label-Resolver.
  - `match-view.ts` — DB-Rows → Offer/Claim/Balance-View-Mapper (pur).
- **Provider-Seam:**
  - `employer-match.provider.interface.ts` (`EMPLOYER_MATCH_PROVIDER` Symbol +
    `lookupByDomain`).
  - `mock-employer-match.provider.ts` (statische ~30-Firmen-DB, deterministisch).
  - `double-the-donation.provider.ts` (env-gated `fetch`-Skeleton, kompiliert, nie
    in Tests).
  - `employer-match-provider.factory.ts` (`shouldUseDtd` + `createEmployerMatchProvider`).
  - `matching.module.ts` (Global-Provider-Binding wie `PaymentsModule`).
- **Service/Controller:**
  - `matching.service.ts` — orchestriert detect/offer/claim/balance über Prisma +
    Provider + reine Cores; reuse E5-`buildSimplePdf` für die Claim-PDF; bucht den
    committeten Match über die bestehende Donation-Form.
  - `matching.controller.ts` — `/matching`-Endpunkte (siehe contracts).
  - `dto/` — `DetectMatchDto`, `MatchOfferDto`, `ClaimMatchDto`.

## Wiederverwendung (kein Neubau)

- **E2 (`donations/`):** der committete Match nutzt die bestehende `Donation`-Form
  (`CORPORATE`/`SEPA`/`SUCCEEDED`) und die `splitContribution`-Kappung; das Angebot
  surft im Checkout (`donate-card.component`). Kein neuer Charge-Pfad.
- **E4 (`donors/`):** der detektierte Arbeitgeber + die Jahres-Balance leben am
  `User`; Balance + Claim-History erscheinen im Donor-Account (`donor.page`).
- **E5 (`corporate/pdf.util.ts`):** `buildSimplePdf` für die Claim-Bestätigungs-PDF —
  keine neue Library/Infra.
- **common/**: `DomainException`, Envelope-Interceptor, `Roles`/`RolesGuard`,
  `CurrentUser`, `OptionalJwtAuthGuard`.

## Datenfluss (Checkout → Offer → Claim)

1. Spender gibt im Checkout seine Arbeits-E-Mail ein → `POST /matching/offer`.
2. Service: `extractDomain` → `provider.lookupByDomain` → `evaluateEligibility` →
   `computeMatch` (Cap via `remainingAnnualCents`) → `resolveLabels` →
   `MatchOfferView`. Eingeloggte DONOR werden persistiert.
3. Spender klickt Claim → `POST /matching/claim`: idempotenter `MatchClaim`,
   Claim-Artefakt (Link/PDF), committete CORPORATE-Match-Spende auf die Kampagne
   (gekappt), `matchUsedCents` += Match (Jahres-Reset bei Jahreswechsel) — alles
   transaktional.
4. Account: `GET /matching/me/balance` zeigt verbleibendes Limit + Claim-History.

## Test-Strategie (TDD, Per-Path-80%)

Jeder reine Core bekommt zuerst `.spec.ts`, dann Implementierung. Der Mock-Provider +
die Factory bekommen `.spec.ts` (deterministisch, kein Netz). Der Service wird mit
gemocktem Prisma + gemocktem Provider getestet. Das DTD-Skeleton und der Controller
bleiben ohne Gate (kompilieren, nicht gegated — wie Stripe/Sumsub-Skeleton).
Per-Path-Gates für alle neuen `matching/*`-Cores + Mock + Factory + Service in
`apps/api/package.json`.

## Frontend (apps/web)

- **Reine Helfer (gegated):** `match-format.ts` (Offer-/Balance-Geld-Formatierung,
  Headline), `employer-label.ts` (Arbeitgeber-Name + Multi-Language-Label-Auswahl).
- **Komponenten (gegated):** `match-offer.component.ts` (Callout + Claim-CTA im
  Checkout, `features/campaign/`), `match-balance.component.ts` +
  `claim-history.component.ts` (`features/donor/`, im Account).
- **Verdrahtung:** `donate-card.component` zeigt nach erfolgreicher Spende das
  Match-Offer (Arbeits-E-Mail-Feld → offer → claim); `donor.page` lädt die Balance.
- `ApiService` + `models.ts` um die Matching-Calls/Views erweitert.

## Risiken

- Doppel-Claim → `MatchClaim.donationId @unique` + Service-Guard (`CLAIM_EXISTS`).
- Over-Funding → committeter Match via `splitContribution` gekappt.
- Migration nicht-interaktiv → `migrate diff`-Fallback (siehe quickstart).
