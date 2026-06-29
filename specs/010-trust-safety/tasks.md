# Tasks — Feature 010 Trust-and-Safety Operations Console (E9, TDD-geordnet)

Tests ZUERST (RED), dann Implementierung (GREEN), dann Refactor. Pure Kerne mit
80%-Per-Path-Gate. Backend `npm --prefix apps/api run test:cov`, Frontend
`npm --prefix apps/web run test:cov`.

## Phase A — Pure Backend-Kerne (höchster Wert, leicht 80%)

- [x] T01 `ofac-keyword-matcher.spec.ts` → `ofac-keyword-matcher.ts`:
      `isSanctionedCountry`, `matchSuspiciousKeywords`, `duplicateScore`
      (normalisiert, case-insensitiv, leer/Unbekannt).
- [x] T02 `moderation-rules.spec.ts` → `moderation-rules.ts`: `evaluateCampaign`
      (Keyword/OFAC/Duplicate/Flags → score+level+reasons+autoFlag),
      `decideModeration` (OPEN→APPROVE/REJECT/ESCALATE, ungültig wirft).
- [x] T03 `card-testing.spec.ts` → `card-testing.ts`: schnelle Versuche +
      fehlgeschlagene Transaktionen → {flagged,score,reasons}.
- [x] T04 `velocity-tracker.spec.ts` → `velocity-tracker.ts`:
      `countWithinWindow`, `exceedsVelocity` (>5/1h), injizierte now, leer.
- [x] T05 `donor-risk.spec.ts` → `donor-risk.ts`: Geo/Size/Velocity/Card-Type,
      Auto-Flag >5k, Level-Mapping.
- [x] T06 `fraud-score.spec.ts` → `fraud-score.ts`: aggregiert Teilsignale,
      Clamp 0-100, Reasons-Merge, `scoreToLevel`.
- [x] T07 `auto-freeze.spec.ts` → `auto-freeze.ts`: `decideCampaignFreeze` (3+),
      `decideDonorFreeze` (2+ Failed + Chargeback), Grenzfälle.
- [x] T08 `chargeback-rules.spec.ts` → `chargeback-rules.ts`:
      `shouldOfferAutoRefund` (Schwelle), `nextChargebackStatus` (Transition).
- [x] T09 `dashboard-aggregation.spec.ts` → `dashboard-aggregation.ts`:
      Fraud-Trend/byKind, Chargeback-Rate, Backlog, byLevel, leer.
- [x] T10 `risk-heat-map.spec.ts` → `risk-heat-map.ts`: Geo-Gruppierung,
      Score/Level, Sortierung, „Unknown", leer.

## Phase B — Services (mit Prisma-Mock)

- [x] T11 `moderation.service.spec.ts` → `moderation.service.ts`: scan (upsert),
      list (sortiert), decide (status + Reject-Freeze + AuditService), NOT_FOUND,
      MODERATION_NOT_OPEN.
- [x] T12 `fraud.service.spec.ts` → `fraud.service.ts`: scoreTransaction
      (FraudSignal + Donor-Freeze + Analytics), scoreDonor, NOT_FOUND.
- [x] T13 `chargeback.service.spec.ts` → `chargeback.service.ts`: ingest
      (idempotent + auto-freeze + Analytics), list, evidence, offerRefund
      (eligible/nicht), Transitions.
- [x] T14 `flag.service.spec.ts` → `flag.service.ts`: create (Kampagne prüfen),
      list, decide, Flagging-Analytics.
- [x] T15 `trust-dashboard.service.spec.ts` → `trust-dashboard.service.ts`:
      dashboard (Aggregation), heatMap, auditCsv.

## Phase C — Dünne Wiring-Schicht

- [x] T16 DTOs: moderation-decision · submit-evidence · offer-refund (leer) ·
      create-flag · flag-decision · score-transaction.
- [x] T17 `trust-safety.controller.ts` (ADMIN), `chargeback-webhook.controller.ts`
      (StripeWebhookGuard), `campaign-flag.controller.ts` (OptionalJwt +
      RateLimit), `trust-safety.module.ts` (Security + Observability importiert),
      in `app.module.ts` einhängen.

## Phase D — Datenbank

- [x] T18 `schema.prisma`: ModerationStatus/RiskLevel/ChargebackStatus/FlagReason/
      FlagStatus; ModerationCase, FraudSignal, Chargeback, CampaignFlag;
      Campaign/User-Freeze+Risk-Felder; Migration `trust_safety`.
- [x] T19 `seed.ts`: auto-geflaggte Kampagne + Moderations-Fälle + Demo-Chargebacks
      + Fraud-Signale/Risk-Scores + Community-Flag; lauffähig + idempotent.

## Phase E — Frontend (Per-Path-Gate)

- [x] T20 `risk-format.spec.ts` → `features/admin/trust-safety/risk-format.ts`.
- [x] T21 `moderation-format.spec.ts` →
      `features/admin/trust-safety/moderation-format.ts`.
- [x] T22 `chargeback-format.spec.ts` →
      `features/admin/trust-safety/chargeback-format.ts`.
- [x] T23 Komponenten: trust-dashboard · moderation-queue · chargeback-queue ·
      trust-safety.page (Operator-Shell + Tabs) · campaign-flag (Reporter-Button).
- [x] T24 Einbindung: `models.ts` (E9-Typen), `api.service.ts` (T&S-Methoden),
      `app.routes.ts` (/admin/trust-safety).

## Phase F — Verify & Gates

- [x] T25 Per-Path-80%-Gates in `apps/api/package.json` (Kerne + Services) +
      `apps/web/jest.config.js` (3 Helfer).
- [x] T26 `npm --prefix apps/api run test:cov` && `npm --prefix apps/web run
      test:cov` && beide `run build` grün && `npm --prefix apps/api run seed`
      grün && `prisma migrate status`/`diff` sauber.
- [x] T27 Commit (logische Einheiten), Branch push, `gh pr create` (Base main),
      EPICS-PROGRESS aktualisieren.
