# Research & Clarify — Feature 008 (Observability & Funnel-Analytics)

Offene Fragen wurden autonom entschieden (kein User-Input). Leitplanken: Constitution
(keine neue Infra ohne Begründung, Immutabilität, Boundary-Validation, `{success,data}`-
Envelope, Trust-by-Design) und die Epic-Direktive "Infrastruktur pragmatisch halten".

## E1 — Welche Observability-Infrastruktur?
**Entscheidung:** Keine. Alles in-process + Postgres, dependency-frei.
**Begründung:** Die Epic-Direktive verlangt explizit "keine neue externe Infra ausser
unvermeidbar". Prometheus/Grafana/OTel-Collector/Sentry wären je ein eigener Dienst,
Container, Scrape-/Push-Pipeline und Secret — unverhältnismäßig für einen Prototyp und
gegen die Constitution-Governance ("a heavier pattern muss begründet werden"). E5
(PDF-Writer) und E6 (in-memory Rate-Limit-Store) haben gezeigt, dass ein getesteter
in-process-Kern ausreicht. Metrics leben in einem in-memory Ring-Buffer (per-Instanz,
wie der Rate-Limit-Store), Funnel-Events in Postgres (durchsuchbar, wie der Audit-Log).
**Verworfen:** OpenTelemetry SDK + Collector (Betriebslast, neue Infra); Sentry (externer
SaaS, PII-Risiko, Secret).

## E2 — Server-seitige vs. client-seitige Funnel-Instrumentierung?
**Entscheidung:** Funnel-Events (Visitor/Page/Checkout-Start/Erfolg) kommen primär vom
**Client** an einen Ingest-Endpunkt; **System-Metrics** (Latenz/Status/Payment-Route)
kommen automatisch vom **globalen Interceptor**. Der geprüfte `DonationsService` wird NICHT
angefasst.
**Begründung:** Produkt-Analytics ist konventionell client-seitig (nur der Browser kennt
`gallery_view`/`campaign_view`/`donate_start` als Funnel). Der globale Interceptor erfasst
serverseitig automatisch jede Route inkl. `/donations/card` (2xx=Erfolg, 402/4xx/5xx=Fehler),
ganz ohne Eingriff in den Money-Pfad — exakt die "robust+nicht destabilisieren"-Linie der
Vorgänger-Epics (E4/E5 koppelten neue Flows bewusst vom E2-Capture ab).
**Verworfen:** `AnalyticsService.track()` in `donateCard()` einzubauen — würde die getestete
geld-kritische Datei destabilisieren ohne Mehrwert (Erfolg/Fehler sieht der Interceptor schon).

## E3 — Wie das globale Metrics-Sammeln verdrahten, ohne Unit-Tests zu brechen?
**Entscheidung:** `MetricsInterceptor` via `APP_INTERCEPTOR` in `ObservabilityModule`
registrieren (analog `RateLimitGuard` via `APP_GUARD` in `SecurityModule` aus E6). Request-ID-
Middleware als leichtgewichtiges `app.use(...)` in `main.ts` (analog Security-Header aus E6).
**Begründung:** Per-Service-`TestingModule`s der Unit-Tests bauen ihre Provider selbst und
ziehen `AppModule` nicht ein — der globale Interceptor taucht dort also nicht auf und bricht
nichts (E6 hat das mit dem globalen Guard bewiesen). Der Interceptor misst nur (tap/finalize)
und verändert die Response nie.

## E4 — Privacy-Modell der Produkt-Analytics?
**Entscheidung:** Consent-gegated, anonyme `visitorId` statt IP, redacted Metadaten.
- `visitorId`: client-seitig generierte Zufalls-ID (kein PII), in `localStorage` gehalten.
- Consent: Default = nur essentielle Events (z.B. `donate_success` als Geschäftszahl); volle
  Analytics (Page-Views/Funnel) erst nach Opt-in. Ein Consent-Banner steuert den Flag.
- Server redacted Event-Metadaten via E6-`redact` vor dem Persistieren.
**Begründung:** GDPR/ePrivacy + Constitution VI (Privacy). IP wird nie als Analytics-Schlüssel
gespeichert; die visitorId ist nicht auf eine Person rückführbar.
**Verworfen:** IP-basiertes Tracking (PII, GDPR-Risiko); Third-Party-Pixel (externer Datenabfluss).

## E5 — SLO/Burn-Rate-Modell?
**Entscheidung:** Google-SRE Multi-Window-Multi-Burn-Rate als purer Kern.
- SLI = good/total Requests im Fenster (good = Status < 500 bzw. < `errorStatusFloor`).
- Error-Budget = `1 - objective` (z.B. 99.9% -> 0.1%).
- Burn-Rate = beobachtete Fehlerrate / Error-Budget. Alert (severity `page`) feuert, wenn das
  schnelle (1h) UND das kurze (5m) Fenster eine hohe Burn-Rate (>= 14.4) überschreiten; ein
  langsamer Ticket-Alert (6h/30m, Burn-Rate >= 6) für schleichenden Budgetverbrauch.
**Begründung:** Standard-Empfehlung aus dem SRE-Workbook; deterministisch + rein rechenbar,
ideal als getesteter Kern. Da kein Zeitreihen-Backend existiert, rechnet der Kern auf den
im Ring-Buffer gehaltenen Samples (Annäherung, ehrlich dokumentiert).
**Verworfen:** Echtes Burn-Rate-Alerting über Prometheus-Rules (neue Infra).

## E6 — Payment-Monitoring-Datenquelle?
**Entscheidung:** Bestehende `Donation`-Tabelle lesen, Alerts aus purem Kern ableiten.
- Card-Decline-Welle: Anteil `FAILED` an den letzten N Card-Donations über Schwelle.
- Hängende Pledges: `PLEDGED`-Donations älter als X mit (theoretisch) erreichbarem Ziel.
- Webhook-Fehler: aus den vom Interceptor erfassten 4xx/5xx auf `/payments/webhook` (severity).
**Begründung:** Keine neue Instrumentierung, kein Eingriff in den Money-Pfad — reine
Read-Aggregation. Konsistent mit der ESG-Read-Aggregation aus E5.

## E7 — Logging-Format?
**Entscheidung:** Strukturierte einzeilige Logs über NestJS `Logger` mit Kontext
`obs`, inkl. `requestId`, `method`, `route`, `status`, `durationMs`; Nachricht vor
Ausgabe durch `redact` gezogen. Kein console.log (Constitution / Coding-Style).
**Begründung:** "zentral durchsuchbar" heißt hier: ein einheitliches, grep-bares Format mit
Korrelations-ID. Ein echtes Log-Aggregat (Loki) wäre neue Infra.

## Wiederverwendung bestehender Bausteine
- `redact` (E6 `security/pii-redact.ts`) für PII-arme Logs + Event-Metadaten.
- `DomainException` + `AllExceptionsFilter` + `ApiResponseInterceptor` für Envelope.
- `RateLimit`-Decorator (E6) auf dem öffentlichen Event-Ingest gegen Spam.
- `OptionalJwtAuthGuard` (E4) für anonymen aber zuordenbaren Event-Ingest.
- `RolesGuard` + `@Roles(ADMIN)` für die Dashboard-Endpunkte.
- In-memory-Store-Muster aus `security/rate-limit.store.ts` für den Metrics-Ring-Buffer.
- Pure-Aggregation-Muster aus `corporate/esg.util.ts` für Funnel/Metrics/SLO.
