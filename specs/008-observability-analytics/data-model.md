# Data Model — Feature 008 (Observability & Funnel-Analytics)

## Prisma — neues Modell

```prisma
/// Privacy-konforme Produkt-/Funnel-Analytics. visitorId ist eine anonyme,
/// client-seitig generierte ID (kein PII, nicht IP). metadata wird vor dem
/// Persistieren PII-redacted (siehe ObservabilityModule/AnalyticsService).
model AnalyticsEvent {
  id         String   @id @default(cuid())
  type       String   // z.B. gallery_view | campaign_view | donate_start | donate_success | onboarding_step
  visitorId  String?  // anonyme Client-ID (kein PII)
  sessionId  String?
  userId     String?
  campaignId String?
  path       String?
  step       String?  // Funnel-/Onboarding-Schritt
  requestId  String?
  metadata   Json?
  createdAt  DateTime @default(now())

  @@index([type, createdAt])
  @@index([campaignId])
}
```

Keine FK-Constraints (kein `onDelete`-Risiko, kein Eingriff in bestehende Relationen) —
`userId`/`campaignId` sind weiche Referenzen, damit Analytics nie eine Geschäftsoperation
blockiert und die Anonymisierung aus E6 nicht verkompliziert.

Migration: `observability_analytics`.

## In-memory (nicht persistiert)

### RequestSample
| Feld | Typ | Bedeutung |
|---|---|---|
| route | string | normalisierte Route (Methode-agnostisch), z.B. `POST /campaigns/:id/donations/card` |
| method | string | HTTP-Verb |
| statusCode | number | finaler HTTP-Status |
| durationMs | number | Bearbeitungsdauer |
| isPaymentPath | boolean | true für `/donations/*` + `/payments/webhook` |
| timestamp | number | Epoch ms |

Gehalten in einem Ring-Buffer fester Größe (z.B. 1000) — per-Instanz, bounded memory.

## Pure-Typen (Domänenmodell der Aggregation)

- `FunnelStepResult { key, label, count, conversionPct, dropOffPct }`
- `FunnelReport { steps: FunnelStepResult[], overallConversionPct }`
- `MetricsSnapshot { totalRequests, errorCount, errorRatePct, p50Ms, p95Ms, paymentTotal, paymentFailed, paymentFailureRatePct }`
- `SloWindow { windowLabel, sliPct, burnRate, budgetConsumedPct }`
- `SloReport { objectivePct, errorBudgetPct, windows: SloWindow[], alert: 'none'|'ticket'|'page' }`
- `PaymentAlert { kind, severity: 'info'|'warning'|'critical', message, value }`
- `HealthReport { status: 'ok'|'degraded', uptimeSeconds, checks: { db: boolean } }`

## Funnel-Schritt-Definitionen (Konstanten)

Donation-Funnel: `gallery_view -> campaign_view -> donate_start -> donate_success`.
Onboarding-Funnel: `onboarding_step` mit `step ∈ { basics, story, video, review, submitted }`.
