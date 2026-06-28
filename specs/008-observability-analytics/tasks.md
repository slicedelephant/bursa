# Tasks — Feature 008 (Observability & Funnel-Analytics)

TDD: Test (RED) vor Implementierung (GREEN). Reihenfolge: pure Kerne -> Stores/Services ->
Interceptor/Controller -> Frontend-Cores -> Komponenten -> Migration/Seed/Wiring -> Verify.

## Backend — pure Kerne (Tests zuerst)
- [ ] T01 `request-id.ts` + spec (resolve/validate/generate)
- [ ] T02 `funnel-steps.ts` + spec (Konstanten, `ANALYTICS_EVENT_TYPES`)
- [ ] T03 `funnel.ts` + spec (`buildFunnel` Conversion/Drop-off)
- [ ] T04 `metrics-aggregate.ts` + spec (Fehlerrate, p50/p95, Payment-Rate)
- [ ] T05 `slo.ts` + spec (Multi-Window-Burn-Rate, Alert-Eskalation)
- [ ] T06 `payment-alerts.ts` + spec (Decline-Welle, hängende Pledges, Webhook-Fehler)
- [ ] T07 `metrics.store.ts` + spec (Ring-Buffer record/samples/since/reset)

## Backend — Services/Interceptor/Controller (Tests zuerst)
- [ ] T08 `metrics.service.ts` + spec (Store + Aggregatoren + SLO)
- [ ] T09 `analytics.service.ts` + spec (Prisma-Mock: record redacted, funnel, onboarding)
- [ ] T10 `payment-monitor.service.ts` + spec (Prisma-Mock -> payment-alerts)
- [ ] T11 `health.service.ts` + spec (DB-Probe ok/degraded)
- [ ] T12 `metrics.interceptor.ts` + spec (misst, redacted Log, Response unverändert)
- [ ] T13 `dto/track-event.dto.ts` (Boundary-Validation, whitelist type)
- [ ] T14 `analytics.controller.ts` + `observability.controller.ts` (wired)
- [ ] T15 `observability.module.ts` (+ APP_INTERCEPTOR) + `app.module.ts`-Import

## Frontend — pure Kerne (Tests zuerst)
- [ ] T16 `core/visitor-id.ts` + spec
- [ ] T17 `core/analytics-consent.ts` + spec
- [ ] T18 `core/funnel-events.ts` + spec
- [ ] T19 `features/admin/observability/funnel-format.ts` + spec
- [ ] T20 `features/admin/observability/metrics-format.ts` + spec
- [ ] T21 `features/admin/observability/slo-format.ts` + spec

## Frontend — Services/Komponenten (Tests zuerst)
- [ ] T22 `core/analytics.service.ts` + spec (consent-gegated POST)
- [ ] T23 `shared/consent-banner.component.ts` + spec
- [ ] T24 `features/admin/observability/funnel-chart.component.ts` + spec
- [ ] T25 `features/admin/observability/metrics-panel.component.ts` + spec
- [ ] T26 `features/admin/observability/slo-panel.component.ts` + spec
- [ ] T27 `observability-dashboard.component.ts` (Seite) + Route + Admin-Link
- [ ] T28 `ApiService` + `models.ts` Erweiterungen

## Migration / Seed / Wiring / Verify
- [ ] T29 Prisma `AnalyticsEvent` + `migrate dev --name observability_analytics`
- [ ] T30 Seed um Demo-AnalyticsEvents erweitern
- [ ] T31 Request-ID-`app.use` in `main.ts`
- [ ] T32 Coverage-Gates (api package.json + web jest.config.js) für alle neuen Dateien
- [ ] T33 Full-Verify: api test, web test:cov, beide build; Live-Smoke; EPICS-PROGRESS + PR
