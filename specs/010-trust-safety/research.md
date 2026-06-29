# Research & Clarify — Feature 010 Trust-and-Safety Operations Console (E9)

Autonom getroffene Entscheidungen (kein User-Input). Jede offene Frage wurde im
Sinne der Constitution (Trust-by-Design, Provider-Abstraktion, Immutabilität,
kleine Module, Boundary-Validation, {success,data}-Envelope) und der EPICS-
PROGRESS-Direktive (pragmatisch, keine neue externe Infra, robuster getesteter
Kern, E6/E7 wiederverwenden) entschieden.

## E1 — Fraud-Scoring: echtes ML vs. deterministische Heuristik

**Entscheidung:** Pure, deterministische Heuristik-Regelfunktionen
(`fraud-score.ts`, `card-testing.ts`, `donor-risk.ts`, `velocity-tracker.ts`),
die `{ score, level, reasons[] }` aus einfachen, gewichteten Signalen ableiten.
Kein trainiertes Modell, kein externer Scoring-Call.

**Begründung:** Ein echtes ML-Modell (Feature-Store, Training, Inference-Infra)
ist eigenes Epic-Volumen und im autonomen Lauf weder testbar noch ohne Daten
sinnvoll. GoFundMe/Stripe Radar sind die Inspiration; eine transparente,
erklärbare Regel (`reasons[]`) ist für einen Prototyp ohnehin besser
auditierbar. Im Out-of-Scope ehrlich abgegrenzt; die Naht (`fraud-score.ts`)
ist klein und später durch einen Modell-Call ersetzbar.

## E2 — Moderations-Audit: neue Tabelle vs. E6-AuditLog

**Entscheidung:** Die **bestehende** E6-`AuditLog` (via `AuditService.record`)
trägt jede Moderations-/Freeze-/Chargeback-Entscheidung (Aktor, Aktion,
Target, Grund im PII-redacteten `metadata`, Resultat). Der CSV-Export liest aus
`AuditService.list`.

**Begründung:** E6 liefert exakt das geforderte Append-only-Log inkl.
PII-Redaction und „Logging bricht nie den Flow". Eine zweite Audit-Tabelle würde
den Trail fragmentieren und gegen „wiederverwenden statt duplizieren" verstoßen.
`ModerationCase` hält den Fall-Zustand; die `AuditLog` hält die Aktions-Historie.

## E3 — Chargeback-Eingang: Polling/Manuell vs. signierter Webhook

**Entscheidung:** Chargebacks treffen als (gemockte) Stripe-Webhook-Events auf
`POST /api/trust-safety/webhooks/chargeback` ein, geschützt durch den
**E6-`StripeWebhookGuard`**. Idempotenz über `Chargeback.providerEventId`
(`@unique`); Doppel-Lieferung erzeugt keinen zweiten Fall.

**Begründung:** Exakt die E6-Naht — der Signatur-Guard ist real wirksam und
deterministisch testbar. Ein echter Stripe-Dispute-API-Call/echte
Evidence-Submission ist Netzwerk-/Key-Risiko und Out-of-Scope; der Mock liefert
den vollen Queue-/Freeze-/Refund-Flow ohne Stripe-Konto.

## E4 — Automatische Freezes: Service-Logik vs. pure Entscheidung

**Entscheidung:** Reine Funktionen in `auto-freeze.ts`:
`decideCampaignFreeze(chargebackCount)` (Freeze ab 3+) und
`decideDonorFreeze({ failedCount, chargebackCount })` (Freeze ab 2+ Failed +
Chargeback-Pattern). Der Service ruft sie auf und setzt nur Status-Flags.

**Begründung:** Constitution IV/V — die kritische Sicherheits-Entscheidung gehört
in einen puren, voll getesteten Kern, nicht verstreut in einen Service. Ein
Freeze fasst den Geld-Pfad nicht an (er setzt `frozen`); damit bleibt
Constitution III („Geld nur an die Schule, über `PaymentProvider`") unberührt.

## E5 — OFAC/Sanktionen: echte API vs. statische Liste

**Entscheidung:** Eine kleine **statische** Länderliste (ISO-Codes) in
`ofac-keyword-matcher.ts`; `isSanctionedCountry(country)` ist case-insensitiv und
pur. Verdächtige Keywords und Duplicate-Detection (normalisierte Titel-/Story-
Ähnlichkeit) liegen daneben.

**Begründung:** Ein echter Sanctions-Provider (OFAC SDN, Sumsub) ist eigenes
Volumen und Synergie mit E11 (KYC). Für den Prototyp macht die statische Liste
den Block-Pfad real wirksam und testbar; im Out-of-Scope abgegrenzt, die Naht ist
ein simpler Funktions-Swap.

## E6 — Donor-Velocity: DB-Aggregat vs. purer Fenster-Tracker

**Entscheidung:** Purer `velocity-tracker.ts`
(`countWithinWindow(timestamps, now, windowMs)` / `exceedsVelocity(...)`); der
Service lädt die jüngsten Spenden-Zeitstempel des Donors und übergibt sie. Regel:
>5 Spenden in 1h.

**Begründung:** Hält die Schwellen-Logik deterministisch und unit-testbar
(injizierte `now`), während die DB-Abfrage dünn im Service bleibt — gleiche
Trennung wie E7 `PaymentMonitorService` ↔ `derivePaymentAlerts`.

## E7 — Dashboard-Metriken: eigenes Backend vs. E7-Reuse

**Entscheidung:** `trust-dashboard.service.ts` ist read-only und aggregiert die
neuen Tabellen über pure Kerne (`dashboard-aggregation.ts`, `risk-heat-map.ts`),
im Muster von `PaymentMonitorService`. Fraud-/Chargeback-Signale werden zusätzlich
best-effort über die **E7-`AnalyticsService`** in den bestehenden Analytics-Stream
geschrieben.

**Begründung:** Kein zweites Metriken-System (Constitution + EPICS-Direktive). Die
pure Aggregation ist testbar; das Einspeisen in E7-Analytics macht die Reuse echt,
ohne den Money-Path oder die Operation zu gefährden (fire-and-forget).

## E8 — Community-Flag: Auth-pflichtig vs. öffentlich + Rate-Limit

**Entscheidung:** `POST /api/campaigns/:id/flags` ist öffentlich (OptionalJwt:
eingeloggte Reporter werden verknüpft, sonst anonym über `visitorId`) und über das
**E6-Velocity-Rate-Limit** geschützt. Persistiert einen `CampaignFlag`; ein
Schwellwert an offenen Flags hebt den Moderations-Risk-Score.

**Begründung:** Reporter-Buttons müssen niederschwellig sein; ein Login-Zwang
würde Meldungen unterdrücken. Das E6-Rate-Limit (kein CAPTCHA — Out-of-Scope)
schützt vor Flag-Spam, ohne neue Infra.

## E9 — Refund-Angebot: echter Refund vs. Entscheidung/Status

**Entscheidung:** `chargeback-rules.ts` liefert `shouldOfferAutoRefund(amountCents,
threshold)`; der Service setzt nur `refundOffered = true` und `status =
REFUND_OFFERED`. Kein echter Geld-Rückfluss.

**Begründung:** Der geprüfte Money-Path bleibt unangetastet (Constitution III);
ein echter Refund-Vollzug verlangt einen Provider-Call und ist Out-of-Scope. Die
reine Schwellen-Regel ist deterministisch testbar.

## Constitution-Check

- **Trust-by-Design:** Moderation/Freeze schützen genau den Trust-Anker; ein
  Freeze stoppt eine Kampagne/ein Konto, ohne den Geld-Pfad anzufassen.
- **Provider-Abstraktion:** `PaymentProvider` unverändert; Chargebacks über den
  E6-Webhook-Guard, kein echter Stripe-Call; OFAC/ML als spätere Naht abgegrenzt.
- **Immutabilität:** alle pure Kerne geben neue Objekte zurück (Scores, Reasons,
  Dashboard, Heat-Map, Entscheidungen).
- **Kleine Module:** zehn pure Kerne + fünf fokussierte Services, jede Datei
  <400 Zeilen, eine Verantwortung.
- **Boundary-Validation & Envelope:** DTOs mit class-validator
  (whitelist/forbidNonWhitelisted/transform); Domain-Fehler im
  `{success,error}`-Envelope; Operator-Endpunkte ADMIN-gegated.
- **Privacy & Security:** Audit-`metadata` PII-redacted (E6); Community-Flag ohne
  PII-Zwang (`visitorId` anonym); Analytics ohne PII.
