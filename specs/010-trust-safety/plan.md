# Implementation Plan — Feature 010 Trust-and-Safety Operations Console (E9)

## Architektur-Überblick

Ein neues, hochkohäsives Feature-Modul `trust-safety/` kapselt Moderation,
Fraud-Scoring, Chargebacks, Freezes, Community-Flagging und das Operator-
Dashboard. ALLE Entscheidungslogik liegt in puren Util-Dateien (je `.spec.ts` +
Per-Path-Gate); die Services sind dünn und an Prisma + die wiederverwendete
E6/E7-Infrastruktur angedockt. Keine neue externe Infra; alles in der
bestehenden Postgres-DB. Bestehende Module werden minimal-invasiv berührt
(Chargeback-Webhook als zusätzlicher signaturgeprüfter Endpoint; Flag-Button-
Endpoint an der Kampagne).

Wiederverwendung statt Neubau:
- **E6 `AuditService`** (record/list) → jede Moderations-/Freeze-/Chargeback-
  Entscheidung; CSV-Export aus `AuditService.list`.
- **E6 `StripeWebhookGuard` + `verifyWebhookSignature`** → der Chargeback-Webhook.
- **E7 `AnalyticsService`** → Fraud-/Chargeback-Signale in den bestehenden
  Analytics-Stream (kein zweites Metriken-System); das Dashboard folgt dem
  Read-only-Derivations-Muster von `PaymentMonitorService` + `derivePaymentAlerts`.

```
apps/api/src/trust-safety/
  ofac-keyword-matcher.ts        (pure)  statische Sanktionsliste + Keyword-/Duplicate-Match
  ofac-keyword-matcher.spec.ts
  moderation-rules.ts            (pure)  Auto-Flag-Evaluation + Decision-Transition
  moderation-rules.spec.ts
  card-testing.ts                (pure)  Card-Testing-Pattern-Detection
  card-testing.spec.ts
  velocity-tracker.ts            (pure)  Zeitfenster-Velocity (>5/1h)
  velocity-tracker.spec.ts
  donor-risk.ts                  (pure)  Geo/Size/Velocity/Card-Type → Donor-Score
  donor-risk.spec.ts
  fraud-score.ts                 (pure)  aggregiert Teilsignale → {score,level,reasons}
  fraud-score.spec.ts
  auto-freeze.ts                 (pure)  Freeze-Entscheidung Kampagne/Donor
  auto-freeze.spec.ts
  chargeback-rules.ts            (pure)  Auto-Refund-Angebot + Status-Transition
  chargeback-rules.spec.ts
  dashboard-aggregation.ts       (pure)  Fraud-Trends/Chargeback-Rate/Backlog
  dashboard-aggregation.spec.ts
  risk-heat-map.ts               (pure)  Geo-Aggregation + Sortierung + Level
  risk-heat-map.spec.ts
  moderation.service.ts          Queue list/get/scan/decide (+ AuditService, auto-freeze)
  moderation.service.spec.ts
  fraud.service.ts               scoreTransaction/scoreDonor (+ FraudSignal, Donor-Freeze)
  fraud.service.spec.ts
  chargeback.service.ts          ingest(webhook)/list/evidence/offerRefund (+ auto-freeze)
  chargeback.service.spec.ts
  flag.service.ts                create/list/decide + Flagging-Analytics
  flag.service.spec.ts
  trust-dashboard.service.ts     Dashboard + Heat-Map + Audit-CSV (read-only)
  trust-dashboard.service.spec.ts
  trust-safety.controller.ts     /trust-safety/* (ADMIN/Operator)
  chargeback-webhook.controller.ts  /trust-safety/webhooks/chargeback (StripeWebhookGuard)
  campaign-flag.controller.ts    /campaigns/:id/flags (public, optional JWT, rate-limited)
  trust-safety.module.ts         Provider/Controller-Wiring (importiert Security + Observability)
  dto/ moderation-decision · submit-evidence · offer-refund · create-flag ·
       flag-decision · score-transaction

apps/api/src/app.module.ts                 + TrustSafetyModule
apps/api/prisma/schema.prisma              + ModerationStatus, RiskLevel, ChargebackStatus,
                                             FlagReason, FlagStatus; ModerationCase, FraudSignal,
                                             Chargeback, CampaignFlag; Campaign/User-Freeze+Risk-Felder
apps/api/prisma/seed.ts                    + geflaggte Kampagne, Moderations-Fälle, Demo-Chargebacks,
                                             Fraud-Signale/Risk-Scores, Community-Flags

apps/web/src/app/features/admin/trust-safety/
  risk-format.ts                 (pure) Risk-Level-Label/Class, EUR, Prozent, Score-Bars
  moderation-format.ts           (pure) Status-Label/Class, Reason-Listen, Backlog-Summary
  chargeback-format.ts           (pure) Chargeback-Status-Label/Class, Refund-Eignung
  trust-dashboard.component.ts         KPI/Fraud-Trends/Chargeback-Rate/Heat-Map
  moderation-queue.component.ts        Queue + approve/reject/escalate
  chargeback-queue.component.ts        Queue + Evidence + Refund-Angebot
  trust-safety.page.ts                 Operator-Shell + Tabs
apps/web/src/app/features/campaign/campaign-flag.component.ts  Reporter-Button (öffentlich)
apps/web/src/app/core/{models.ts, api.service.ts}  + E9-Typen/Methoden
apps/web/src/app/app.routes.ts        + /admin/trust-safety
```

## TDD-Reihenfolge (Tests zuerst, RED → GREEN → REFACTOR)

Pure Kerne zuerst (leicht 80%, höchster Wert), dann Services (mit Prisma-Mock),
zuletzt dünne Wiring-Schicht + Frontend.

1. **ofac-keyword-matcher** (pure) — statische Liste + Keyword-/Duplicate-Match.
2. **moderation-rules** (pure) — Auto-Flag-Score + Decision-Transition.
3. **card-testing** → **velocity-tracker** → **donor-risk** → **fraud-score** (pure).
4. **auto-freeze** (pure) — Freeze-Entscheidungen Kampagne/Donor.
5. **chargeback-rules** (pure) — Auto-Refund-Angebot + Status-Transition.
6. **dashboard-aggregation** → **risk-heat-map** (pure) — Aggregation.
7. **Services** (mit Prisma-Mock): moderation → fraud → chargeback → flag →
   trust-dashboard.
8. **Wiring**: Controller (operator/webhook/flag), trust-safety.module,
   app.module.
9. **Prisma-Migration** `trust_safety` + Seed-Erweiterung.
10. **Frontend** pure Helfer (risk-format/moderation-format/chargeback-format) +
    Komponenten + Routen + api.service/models + Flag-Button an der Kampagne.
11. **VERIFY**: api test:cov, web test:cov, beide build, seed; Per-Path-Gates
    eintragen; migrate status/diff.

## Risiko-/Stabilitäts-Leitplanken

- **Geld-Pfad unangetastet:** Ein Freeze setzt nur Status-Flags
  (`Campaign.frozen`/`User.frozen`); das Auto-Refund-Angebot ist ein Status, kein
  echter Refund. `PaymentProvider` wird nicht berührt; Geld weiterhin nur an die
  Schule (Constitution II/III).
- **Webhook fail-closed:** Der Chargeback-Endpoint läuft hinter dem
  E6-`StripeWebhookGuard` (Signatur über Raw-Body, timing-safe), verwirft
  ungültige Payloads mit `400` und ist über `providerEventId` idempotent
  (Doppel-Lieferung erzeugt keinen zweiten Fall).
- **Audit kann nie den Flow brechen:** `AuditService.record` schluckt eigene
  Fehler (E6-Design); Moderation/Freeze laufen auch bei Logging-Fehler durch.
- **Analytics fire-and-forget:** Fraud-/Chargeback-Signale werden best-effort in
  den E7-Stream geschrieben; ein Analytics-Fehler bricht nie die Operation.
- **Reine Heuristik, deterministisch:** alle Scores/Entscheidungen sind pure
  Funktionen mit injizierter Clock — kein Netzwerk, kein ML, voll testbar.
- **Migration additiv** (neue Tabellen + neue Enums + nullable/Default-Spalten)
  → keine Datenmigration nötig.

## Complexity Tracking

- **Eigenes `trust-safety`-Modul statt Ausbau von `admin`/`security`:**
  gerechtfertigt — Trust-and-Safety ist eine eigene Domäne mit fünf Services und
  zehn puren Kernen; sie in `admin` zu quetschen würde Kohäsion senken.
  Datei-Disziplin (<400 Zeilen, eine Verantwortung je Datei) bleibt gewahrt.
- **Vier neue Tabellen + fünf neue Enums:** gerechtfertigt — Moderation,
  Fraud-Signale, Chargebacks und Community-Flags brauchen je eine persistente,
  durchsuchbare Spur; gleiche DB, keine neue Infra. Der Audit-Trail nutzt
  bewusst die **bestehende** E6-`AuditLog` (keine sechste Tabelle).
- **Heuristik statt ML:** bewusst — ein deterministischer Regelkern ist im
  autonomen Lauf 100% testbar und ohne Netzwerk/Keys lauffähig; das echte
  ML-/Radar-Pendant ist im Out-of-Scope ehrlich abgegrenzt.
- **Dependency-freie Eigenbauten** (Keyword-/Duplicate-Match, Velocity-Fenster,
  Score-Aggregation): bewusst statt Libraries — Linie von E6/E7, hält den Code
  netzwerk-frei und voll deterministisch.
