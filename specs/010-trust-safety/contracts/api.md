# API Contracts — Feature 010 Trust-and-Safety Operations Console (E9)

Alle Responses folgen dem Envelope `{ success, data?, error? }`.
Fehler: `{ success: false, error: { code, message, details? } }`.

## Operator-Console (JWT, Rolle `ADMIN`)

### GET /api/trust-safety/dashboard
Aggregierte Trust-Kennzahlen (read-only).
```
200 { success:true, data:{
  fraud:{ totalSignals, highRiskSignals, byKind:[{kind,count}], trend:[{date,count}] },
  chargebacks:{ open, total, chargebackRatePct, refundOffered, byStatus:[{status,count}] },
  moderation:{ backlog, openCases, escalated, byLevel:[{level,count}] },
  flags:{ open, total, byReason:[{reason,count}] },
  frozen:{ campaigns, donors } } }
```

### GET /api/trust-safety/heat-map
Risk-Heat-Map nach Spender-Geografie (nutzt `Donation.donorCountry` + Signale).
```
200 { success:true, data:{ rows:[{ country, donationCount, signalCount,
       chargebackCount, riskScore, riskLevel }] } }
```

### GET /api/trust-safety/moderation?status=OPEN|APPROVED|REJECTED|ESCALATED
Moderations-Queue, absteigend nach `riskScore` (Default `status=OPEN`).
```
200 { success:true, data:[{ id, campaignId, campaignTitle, status, riskScore,
       riskLevel, reasons, autoFlagged, decisionNote, reviewedAt, createdAt }] }
```

### POST /api/trust-safety/campaigns/:campaignId/scan
Führt die Auto-Flag-Regeln neu aus und upsertet den `ModerationCase`
(idempotent auf `campaignId`). → `200` (Fall). Fremde/fehlende Kampagne →
`404 NOT_FOUND`.

### POST /api/trust-safety/moderation/:id/decide
Body: `{ action: "APPROVE"|"REJECT"|"ESCALATE", note }` (`note` min. 1 Zeichen).
Setzt den Fall-Status; `REJECT` friert die Kampagne ein (`frozen=true`).
Schreibt einen **AuditLog**-Eintrag (Aktor, Aktion, Target, Grund, Resultat).
Ungültiger Übergang (Fall nicht OPEN) → `409 MODERATION_NOT_OPEN`. → `200`.

### GET /api/trust-safety/fraud-signals?donorUserId=&kind=&take=
→ `200` Liste der `FraudSignal` (optional gefiltert).

### POST /api/trust-safety/transactions/:donationId/score
Berechnet den Transaktions-Fraud-Score neu, persistiert ein `FraudSignal` und
prüft Donor-Auto-Freeze. → `200 { signal, donorFrozen }`. Fehlende Donation →
`404 NOT_FOUND`.

### GET /api/trust-safety/chargebacks?status=OPEN|EVIDENCE_SUBMITTED|REFUND_OFFERED|WON|LOST
→ `200` Liste der `Chargeback`, absteigend nach `createdAt`.

### POST /api/trust-safety/chargebacks/:id/evidence
Body: `{ note }` (min. 1 Zeichen). Setzt `evidenceNote`, `status =
EVIDENCE_SUBMITTED`. Nicht offener Fall → `409 CHARGEBACK_NOT_OPEN`. → `200`.

### POST /api/trust-safety/chargebacks/:id/offer-refund
Nur wenn `chargeback-rules.shouldOfferAutoRefund(amountCents)` (niedriger Dispute):
setzt `refundOffered=true`, `status = REFUND_OFFERED` (kein echter Refund). Sonst
`409 REFUND_NOT_ELIGIBLE`. → `200`.

### GET /api/trust-safety/flags?status=OPEN|REVIEWED|DISMISSED
→ `200` Liste der `CampaignFlag`.

### POST /api/trust-safety/flags/:id/decide
Body: `{ action: "REVIEW"|"DISMISS", note? }`. Setzt den Flag-Status. → `200`.

### GET /api/trust-safety/audit.csv
`text/csv`-Export aller Moderations-Aktionen aus der **E6-AuditLog** (Spalten:
`createdAt,action,actorUserId,targetType,targetId,result`). → `200`.

## Chargeback-Webhook (öffentlich, signaturgegated — kein JWT)

### POST /api/trust-safety/webhooks/chargeback
Geschützt durch den **E6-`StripeWebhookGuard`** (HMAC über Raw-Body, timing-safe,
Replay-Toleranz). Body: Stripe-artiges Event
`{ id, type:"charge.dispute.created", data:{ object:{ id, amount, currency,
reason, metadata:{ campaignId?, donationId? } } } }`. Idempotent über
`providerEventId` (= Dispute-ID). Legt den `Chargeback` an, speist ein
E7-Analytics-Event ein und friert die Kampagne bei **3+** Chargebacks
automatisch ein. → `200 { received:true, chargebackId, campaignFrozen }`.
Ungültige Signatur → `400 INVALID_SIGNATURE`.

## Community-Flag (öffentlich, optionaler JWT, rate-limited)

### POST /api/campaigns/:campaignId/flags
OptionalJwt (eingeloggte Reporter werden verknüpft, sonst anonym) + E6-Velocity-
Rate-Limit. Body: `{ reason: FlagReason, note?, visitorId? }`. Persistiert einen
`CampaignFlag` (Status OPEN). Fehlende Kampagne → `404 NOT_FOUND`. Zu viele
Reports → `429 RATE_LIMITED`. → `201 { success:true, data:{ id, status } }`.

## Cross-cutting (bestehend, wiederverwendet)

- **E6 `AuditService`** trägt jede Moderations-/Freeze-/Chargeback-Aktion (kein
  neuer Audit-Endpoint, kein neues Log).
- **E7 `AnalyticsService`** erhält `trust.fraud_signal` / `trust.chargeback`-
  Events (fire-and-forget; kein neues Metriken-System).
- `PaymentProvider` unverändert; Freeze/Refund-Angebot fassen den Geld-Pfad
  nicht an.

## Fehlercodes (neu)

`NOT_FOUND` (Kampagne/Fall/Chargeback/Donation/Flag), `MODERATION_NOT_OPEN`,
`CHARGEBACK_NOT_OPEN`, `REFUND_NOT_ELIGIBLE`, `INVALID_SIGNATURE` (E6-Guard),
`RATE_LIMITED` (E6-Guard).
