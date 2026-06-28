# API Contracts — Feature 008 (Observability & Funnel-Analytics)

Alle Antworten im Envelope `{ success, data?, error? }`. Fehler-Codes wie im Bestand
(`VALIDATION_ERROR`, `RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`).

## Öffentlich / Anonym

### POST /api/analytics/events
Ingest eines Produkt-/Funnel-Events. `OptionalJwtAuthGuard` (zuordenbar wenn eingeloggt,
sonst anonym). `@RateLimit({ limit: 60, windowMs: 60_000, name: 'analytics-ingest' })`.

Body (boundary-validiert, whitelist):
```json
{
  "type": "campaign_view",
  "visitorId": "v_8f3a...",          // anonyme Client-ID, kein PII
  "sessionId": "s_12...",            // optional
  "campaignId": "ckx...",            // optional
  "path": "/campaigns/ckx...",       // optional
  "step": "story",                   // optional (Onboarding)
  "metadata": { "ref": "share" }      // optional, wird serverseitig redacted
}
```
- `type` ist eine Whitelist (`@IsIn(ANALYTICS_EVENT_TYPES)`).
- Response: `{ success: true, data: { recorded: true } }`. Ingest wirft nie auf
  Persistenz-Fehler (fire-and-forget-Semantik, defensiv geloggt).

### GET /api/health
Liveness + DB-Readiness für externes Synthetic-/Uptime-Monitoring. Kein Auth.
```json
{ "success": true, "data": { "status": "ok", "uptimeSeconds": 1234, "checks": { "db": true } } }
```
`status: "degraded"` (HTTP bleibt 200, `checks.db=false`) wenn die DB-Probe scheitert.

## Admin (JwtAuthGuard + RolesGuard + @Roles(ADMIN))

### GET /api/observability/funnel
Aggregierter Funnel. Optionaler Query `?campaignId=` engt auf eine Kampagne ein.
```json
{
  "success": true,
  "data": {
    "donation": { "steps": [ { "key": "gallery_view", "label": "Gallery view", "count": 120, "conversionPct": 100, "dropOffPct": 0 }, ... ], "overallConversionPct": 4.2 },
    "onboarding": { "steps": [ ... ], "overallConversionPct": 38.0 }
  }
}
```

### GET /api/observability/metrics
System-Metrics-Snapshot aus dem Ring-Buffer.
```json
{ "success": true, "data": { "totalRequests": 980, "errorCount": 7, "errorRatePct": 0.71, "p50Ms": 12, "p95Ms": 84, "paymentTotal": 40, "paymentFailed": 2, "paymentFailureRatePct": 5.0 } }
```

### GET /api/observability/slo
SLO + Multi-Window-Burn-Rate auf dem Spenden-/kritischen Pfad.
```json
{
  "success": true,
  "data": {
    "objectivePct": 99.9,
    "errorBudgetPct": 0.1,
    "windows": [ { "windowLabel": "fast", "sliPct": 99.95, "burnRate": 0.5, "budgetConsumedPct": 5.0 }, ... ],
    "alert": "none"
  }
}
```

### GET /api/observability/payment-alerts
Abgeleitete Payment-/Webhook-Alerts (Read-Aggregation über `Donation` + Ring-Buffer).
```json
{ "success": true, "data": { "alerts": [ { "kind": "card_decline_wave", "severity": "warning", "message": "Card failure rate 32% over last 25 donations", "value": 32 } ] } }
```

## Verdrahtung (global, additiv)

- **RequestId-Middleware** (`app.use` in `main.ts`): übernimmt/erzeugt `x-request-id`, spiegelt
  sie in die Response und legt sie auf `req.requestId`.
- **MetricsInterceptor** (`APP_INTERCEPTOR` in `ObservabilityModule`): misst je Request Latenz +
  Status + Route, schreibt ein `RequestSample` in den Store und eine strukturierte, redacted
  Logzeile. Verändert die Response nie.
