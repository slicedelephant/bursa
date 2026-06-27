# Plan — Feature 008 (Observability & Funnel-Analytics)

## Architektur-Überblick

Neues Backend-Modul `apps/api/src/observability/` (cross-cutting, analog `security/`),
neue Frontend-Cores in `apps/web/src/app/core/` + eine Admin-Observability-Seite unter
`apps/web/src/app/features/admin/observability/`. Kein Eingriff in den geld-kritischen
E2-Pfad; globale Verdrahtung additiv (Interceptor via `APP_INTERCEPTOR`, Request-ID via
`app.use`), exakt wie E6 den Rate-Limit-Guard global einhängte ohne Unit-Tests zu brechen.

## Constitution-Check
- **I Spec-Driven:** spec -> research -> plan -> data-model -> contracts -> tasks -> impl. OK.
- **II Trust by Design:** Audit/Money unverändert; Analytics ist Read/Append, blockiert nie
  Geschäftsoperationen. OK.
- **III Payment-Abstraktion:** unberührt; Payment-Monitoring liest nur `Donation`. OK.
- **IV Immutabilität & kleine Module:** alle Aggregatoren pur + immutabel; viele kleine Dateien
  (200-400 Zeilen). OK.
- **V Boundary-Validation & Envelope:** Event-Ingest mit DTO-Whitelist; alle Responses im
  `{success,data}`-Envelope. OK.
- **VI Privacy:** anonyme visitorId statt IP, Consent-Gate, redacted Metadaten/Logs. OK.
- **Komplexität/Infra:** KEINE neue externe Infra — in-memory + Postgres, dependency-frei.
  Begründung in research.md (E1). OK.

## Backend-Bausteine (`apps/api/src/observability/`)

Pure Kerne (Coverage-Rückgrat, je eigener Spec):
1. `request-id.ts` — `resolveRequestId(headerVal?)`, `isValidRequestId`, `generateRequestId`.
2. `funnel-steps.ts` — Konstanten: Donation-/Onboarding-Schritte, `ANALYTICS_EVENT_TYPES`.
3. `funnel.ts` — `buildFunnel(counts, stepDefs)` -> `FunnelReport` (Conversion/Drop-off).
4. `metrics-aggregate.ts` — `aggregate(samples)` -> `MetricsSnapshot` (Fehlerrate, p50/p95,
   Payment-Rate), inkl. `percentile()`.
5. `slo.ts` — `evaluateSlo(windows, objectivePct, errorStatusFloor)` -> `SloReport`
   (Multi-Window-Burn-Rate, Alert-Eskalation none/ticket/page).
6. `payment-alerts.ts` — `derivePaymentAlerts(input)` -> `PaymentAlert[]`
   (Card-Decline-Welle, hängende Pledges, Webhook-Fehler).
7. `metrics.store.ts` — in-memory Ring-Buffer (`record`, `samples`, `since`, `reset`).

Wired/Services:
8. `metrics.service.ts` — kapselt Store + Aggregatoren; `record()`, `snapshot()`, `slo()`.
9. `analytics.service.ts` — Postgres: `record(event)` (redacted, fire-and-forget),
   `funnel(campaignId?)`, `onboardingFunnel()`.
10. `payment-monitor.service.ts` — liest `Donation`, ruft `payment-alerts`.
11. `health.service.ts` — Liveness + DB-Probe -> `HealthReport`.
12. `metrics.interceptor.ts` — `APP_INTERCEPTOR`, misst je Request, strukturiertes redacted Log.
13. `dto/track-event.dto.ts` — Boundary-Validation (whitelist `type`).
14. `analytics.controller.ts` — `POST /analytics/events`, `GET /health`.
15. `observability.controller.ts` — Admin: `/observability/funnel|metrics|slo|payment-alerts`.
16. `observability.module.ts` — providers + `APP_INTERCEPTOR`-Registrierung + Export.
17. `main.ts` — Request-ID-`app.use` (dünner Wrapper um `request-id.ts`).
18. `app.module.ts` — `ObservabilityModule` importieren.

## Frontend-Bausteine

Pure Cores (`apps/web/src/app/core/`):
- `visitor-id.ts` — `getOrCreateVisitorId(storage)` (anonym, persistiert).
- `analytics-consent.ts` — `readConsent`, `writeConsent`, `mayTrack(type, consent)`.
- `funnel-events.ts` — Event-Namen + Builder `pageViewEvent`, `donateStartEvent`, etc.
- `analytics.service.ts` — Angular-Service: `track(event)` (consent-gegated, fire-and-forget POST).

Admin-Dashboard (`apps/web/src/app/features/admin/observability/`):
- `funnel-format.ts` (pur) — Funnel-Schritte für die Anzeige (Balkenbreite, %-Labels).
- `metrics-format.ts` (pur) — Latenz/Fehlerrate/Payment-Rate-Labels + Health-Status-Farbe.
- `slo-format.ts` (pur) — SLO/Burn-Rate -> Badge/Status-Label + Alert-Severity-Klasse.
- `funnel-chart.component.ts` — rendert Funnel-Balken.
- `metrics-panel.component.ts` — rendert Metrics-Kacheln + Payment-Alerts.
- `slo-panel.component.ts` — rendert SLO/Burn-Rate-Fenster + Alert.
- `observability-dashboard.component.ts` — Seite, lädt alle vier Endpunkte, komponiert Panels.
- `consent-banner.component.ts` (`shared/`) — Consent-Banner (accept/decline).

Verdrahtung:
- `ApiService`: `trackEvent`, `health`, `funnel`, `obsMetrics`, `slo`, `paymentAlerts`.
- Route `/admin/observability` (ADMIN-Guard) + Link von der Admin-Seite.
- `models.ts`: neue Interfaces.
- Consent-Banner in `app.html`/Navbar einhängen (additiv).

## TDD-Reihenfolge
Pure Kerne zuerst (RED->GREEN), dann Stores/Services (mit Prisma-Mocks), dann Interceptor/
Controller, dann Frontend-Cores, dann Komponenten. Migration + Seed + globale Verdrahtung am
Ende, dann Full-Verify (api test, web test:cov, beide build) + Live-Smoke.

## Coverage-Gates
Alle neuen Dateien als 80%-Per-Path-Gate in `apps/api/package.json` (jest) und
`apps/web/jest.config.js` eintragen.

## Risiken
- Globaler Interceptor könnte Unit-Tests beeinflussen -> via `APP_INTERCEPTOR` im Modul (nur
  AppModule/e2e), nicht in main.ts-`useGlobalInterceptors` mit Instanz. Mitigation bewiesen durch E6.
- SLO rechnet ohne Zeitreihen-Backend auf dem Sample-Fenster -> als Annäherung ehrlich dokumentiert.
