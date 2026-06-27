# Feature 008 — Observability & Funnel-Analytics (Logging, Metrics, Payment-Monitoring, Uptime/SLO)

## WHY

Jede Erfolgskennzahl, die E1-E5 versprechen ("Conversion-Rate steigt messbar",
"mobile Checkout-Abschluss-Rate", "Onboarding-Abschlussquote", "Wiederspender-Quote"),
ist heute schlicht nicht messbar, weil keine Instrumentierung existiert. Der
Betreiber fliegt blind: Bricht der Spenden-Checkout, merkt es niemand, bis sich
Spender beschweren — und unter All-or-Nothing mit Deadline bis Studienstart
bedeutet jede Stunde Checkout-Ausfall verlorene Kampagnen, die nicht nachgeholt
werden können. Funnel-Daten (Visitor -> Kampagne -> Spendenstart -> Abschluss)
sind der Standard-Hebel, um zu sehen, wo Spender abspringen; gehäufter Abbruch in
der Payment-Stufe ist oft das erste Signal für ein Gateway- oder Vertrauensproblem.
Ohne Logs, Metrics und Alerting gibt es keine Vorfallserkennung, keine Datengrundlage
für die Conversion-Optimierung der Roadmap und keinen Beleg für die ESG-/Impact-Zahlen
aus E5.

Dieses Epic verwandelt Blindflug in Steuerbarkeit — bewusst **ohne neue externe
Infrastruktur** (kein Prometheus/Grafana/OTel-Collector/Datadog). Alles läuft
in-process plus Postgres, dependency-frei, in der Tradition des E5-PDF-Writers und
der E6-Security-Stores. Horizontale Skalierung würde die in-memory-Stores später
hinter einen geteilten Store tauschen; der robuste, getestete Kern bleibt gleich.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Strukturiertes, PII-armes Logging mit Korrelations-IDs**: jede Anfrage bekommt
  eine Request-ID (aus `x-request-id` übernommen oder generiert), die über Middleware
  in die Response gespiegelt und in jede Logzeile geschrieben wird. Logzeilen werden
  vor der Ausgabe durch die bestehende `redact`-Funktion (E6) gezogen, sodass keine
  Mails/Tokens/Kartennummern in Logs landen.
- **System-Metrics je Request** (global, automatisch): Latenz, HTTP-Status, Route
  und Erfolg/Fehler werden je Request in einem in-memory Ring-Buffer erfasst. Daraus
  berechnet ein purer Aggregator Request-Count, Fehlerrate, p50/p95-Latenz sowie die
  Payment-Erfolgs-/Fehlerrate auf dem Donation-Pfad — ohne den geprüften Money-Code
  zu berühren (der globale Interceptor misst von außen).
- **Datenschutzkonforme Produkt-/Funnel-Analytics**: das Frontend meldet Funnel-Events
  (`gallery_view`, `campaign_view`, `donate_start`, `donate_success`, `onboarding_step`)
  an einen consent-gegateten, boundary-validierten Ingest-Endpunkt. Statt IP wird eine
  anonyme, client-seitig generierte `visitorId` (kein PII) verwendet; ohne Analytics-Consent
  werden nur essentielle Events gesendet. Persistiert als `AnalyticsEvent` (Metadaten
  redacted).
- **Funnel-/Drop-off-Aggregation**: ein purer Aggregator verdichtet die Events zum
  Donation-Funnel (Schritt -> Count -> Conversion% -> Drop-off%) und zum Onboarding-Funnel
  je Schritt, als gemeinsame Wahrheit für die E1-E5-Erfolgsindikatoren.
- **Payment-/Webhook-Monitoring mit Alert-Ableitung**: ein Service liest die bestehende
  `Donation`-Tabelle (keine zusätzliche Instrumentierung nötig) und ein purer Kern leitet
  Alerts ab — erhöhte Fehlerrate (Card-Decline-Welle), hängende Pledges (lange PLEDGED ohne
  Capture trotz erreichbarem Ziel) und Webhook-Fehler — mit Schweregrad.
- **Uptime-/Synthetic-Health + SLO/Burn-Rate**: ein öffentlicher `GET /health`-Endpunkt
  (Liveness + DB-Readiness) für externes Synthetic-Monitoring, plus ein purer
  Multi-Window-Burn-Rate-Kern (Google SRE: schnelles 1h/5m- + langsames 6h/30m-Fenster) der
  aus den Request-Samples SLI, verbrauchtes Error-Budget und Burn-Rate berechnet und sagt,
  ob ein Page/Ticket-Alert feuert.
- **Betreiber-Dashboard (Admin)**: eine Observability-Seite im Admin-Bereich rendert Funnel,
  System-Metrics, SLO/Burn-Rate und Payment-Alerts aus einem Blick.

## Out of Scope (ehrlich)

- Keine externe Observability-Infra (Prometheus/Grafana/Loki/OTel-Collector/Datadog/Sentry).
  Stores sind in-memory/per-Instanz; SLO/Burn-Rate rechnet auf dem laufenden Sample-Fenster,
  nicht auf historischen Zeitreihen.
- Kein echtes E-Mail-/PagerDuty-Alerting-Versenden — Alerts werden berechnet und im Dashboard/
  als Log ausgegeben (kein SMTP, konsistent mit E4-EmailLogger).
- Kein Cron-getriebenes Synthetic-Polling im Repo — `GET /health` ist der Probe-Endpunkt,
  den ein externer Monitor (oder ein manueller Smoke) anpingt.
- Keine Änderung am geld-kritischen E2-Capture-Pfad. Funnel-Erfolg/-Fehler wird vom Client
  und vom globalen Interceptor erfasst, nicht durch Eingriffe in `DonationsService`.

## User Stories

### US1 — Betreiber erkennt Checkout-Ausfälle in Minuten (P1)
Als Plattform-Betreiber will ich auf einem Dashboard die Payment-Erfolgs-/Fehlerrate, die
API-Fehlerrate und Payment-Alerts sehen, damit ich einen brechenden Checkout in Minuten statt
über Beschwerden erkenne. **Akzeptanz:** Bei einer Welle fehlgeschlagener Card-Donations zeigt
das Dashboard eine erhöhte Payment-Fehlerrate und einen Alert mit Schweregrad; jede Anfrage ist
über die Request-ID korrelierbar.

### US2 — Betreiber misst den Donation-Funnel (P1)
Als Betreiber will ich den Funnel Visitor -> Kampagne -> Spendenstart -> Abschluss mit Conversion-
und Drop-off-Raten je Schritt sehen, damit ich weiß, wo Spender abspringen. **Akzeptanz:** Aus den
gemeldeten Events berechnet das System je Schritt Count, Conversion% und Drop-off%; der Onboarding-
Funnel ist analog ablesbar.

### US3 — Spender-Privatsphäre bleibt gewahrt (P1)
Als Spender will ich, dass mein Verhalten ohne mein Einverständnis nicht analytisch getrackt wird und
dass keine PII in Logs/Events landet. **Akzeptanz:** Ohne Analytics-Consent werden nur essentielle Events
gesendet; statt IP wird eine anonyme visitorId verwendet; Event-Metadaten und Logs sind PII-redacted.

### US4 — Betreiber hat ein SLO mit Burn-Rate-Alarm auf dem Spenden-Flow (P2)
Als Betreiber will ich ein SLO mit Error-Budget und Multi-Window-Burn-Rate-Alerting auf dem kritischen
Pfad, damit Ausfälle erkannt werden, bevor Kampagnen-Deadlines reißen. **Akzeptanz:** Der pure SLO-Kern
liefert SLI, verbrauchtes Error-Budget und einen Burn-Rate-Alarm (fast+slow window) deterministisch; ein
`GET /health`-Endpunkt erlaubt externes Uptime-Monitoring.

## Key Entities

- **AnalyticsEvent** (neu, Postgres): `type` (Funnel-/Produkt-Event), `visitorId` (anonym, kein PII),
  `sessionId?`, `userId?`, `campaignId?`, `path?`, `step?` (Funnel-/Onboarding-Schritt), `requestId?`,
  `metadata` (Json, redacted), `createdAt`. Indizes auf `(type, createdAt)` und `campaignId`.
- **RequestSample** (in-memory, nicht persistiert): `route`, `method`, `statusCode`, `durationMs`,
  `isPaymentPath`, `timestamp`. Fütterung des Metrics-Aggregators und des SLO-Kerns.

## Success Criteria

- Donation-Funnel über alle Schritte (Gallery -> Kampagne -> Start -> Abschluss) durchgängig aus
  einem Dashboard ablesbar; Onboarding-Funnel ebenso.
- Payment-Fehlerrate und Payment-Alerts sichtbar; jede Anfrage über Request-ID korrelierbar.
- SLO mit Multi-Window-Burn-Rate-Alarm auf dem Spenden-Flow berechnet; `GET /health` für Synthetic-
  Monitoring verfügbar.
- Produkt-Analytics consent-gegated und PII-arm (anonyme visitorId, redacted Metadaten/Logs).
- App bleibt lauffähig + deploybar: Migration `observability_analytics` committed, Seed um Demo-Events
  erweitert, beide Builds grün, neuer Code >= 80% (Per-Path-Gates).
