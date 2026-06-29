# Data Model — Feature 010 Trust-and-Safety Operations Console (E9)

Migration: `trust_safety` (additiv — neue Tabellen, neue Enums, nullable Spalten
und Default-Spalten; keine Datenmigration nötig).

## Neu: enum ModerationStatus

`OPEN` → `APPROVED` / `REJECTED` / `ESCALATED`. Übergänge gehören der puren
`moderation-rules.ts` (`decideModeration`); REJECT friert die Kampagne ein.

## Neu: enum RiskLevel

`LOW` → `MEDIUM` → `HIGH` → `CRITICAL`. Aus dem numerischen Score abgeleitet
(`fraud-score.ts`/`donor-risk.ts`); treibt Sortierung und Heat-Map-Färbung.

## Neu: enum ChargebackStatus

`OPEN` → `EVIDENCE_SUBMITTED` / `REFUND_OFFERED` → `WON` / `LOST`. Übergänge in
`chargeback-rules.ts`.

## Neu: enum FlagReason / enum FlagStatus

`FlagReason`: `SCAM`, `DUPLICATE`, `INAPPROPRIATE`, `MISLEADING`, `OTHER`.
`FlagStatus`: `OPEN` → `REVIEWED` / `DISMISSED`.

## Neu: ModerationCase

Ein Fall pro Kampagne; idempotenter Re-Scan über `@unique` campaignId.

| Feld         | Typ              | Notiz                                       |
|--------------|------------------|---------------------------------------------|
| id           | String cuid      | PK                                          |
| campaignId   | String           | unique, FK → Campaign.id (Cascade)          |
| status       | ModerationStatus | default OPEN                                |
| riskScore    | Int              | 0-100 (aus `moderation-rules.ts`)           |
| riskLevel    | RiskLevel        | default LOW                                 |
| reasons      | Json             | string[] der ausgelösten Regeln             |
| autoFlagged  | Boolean          | default false                               |
| decisionNote | String?          | Pflicht-Grund bei approve/reject/escalate   |
| reviewedById | String?          | FK → User.id (SetNull)                       |
| reviewedAt   | DateTime?        |                                             |
| createdAt/updatedAt | DateTime  |                                             |

Index: `@@index([status, riskScore])`.

## Neu: FraudSignal

Protokolliertes Fraud-/Risk-Signal pro Transaktion bzw. Spender. Weiche
Referenzen (SetNull), damit ein gelöschter Datensatz das Signal nie bricht.

| Feld        | Typ         | Notiz                                          |
|-------------|-------------|------------------------------------------------|
| id          | String cuid | PK                                             |
| kind        | String      | CARD_TESTING / DONOR_RISK / VELOCITY / HIGH_VALUE |
| score       | Int         | 0-100                                          |
| riskLevel   | RiskLevel   | default LOW                                    |
| reasons     | Json        | string[]                                       |
| donationId  | String?     | FK → Donation.id (SetNull)                     |
| donorUserId | String?     | FK → User.id (SetNull, Relation "DonorFraud")  |
| campaignId  | String?     | weiche Referenz                                |
| createdAt   | DateTime    | @default(now())                                |

Indizes: `@@index([donorUserId, createdAt])`, `@@index([kind, createdAt])`,
`@@index([campaignId])`.

## Neu: Chargeback

Ein Dispute aus einem (gemockten) Stripe-Webhook-Event.

| Feld            | Typ              | Notiz                                    |
|-----------------|------------------|------------------------------------------|
| id              | String cuid      | PK                                       |
| providerEventId | String           | unique (Idempotenz des Webhooks)         |
| donationId      | String?          | FK → Donation.id (SetNull)               |
| campaignId      | String?          | FK → Campaign.id (SetNull)               |
| amountCents     | Int              |                                          |
| currency        | String           | default "EUR"                            |
| reason          | String           | z.B. `fraudulent`, `product_not_received`|
| status          | ChargebackStatus | default OPEN                             |
| evidenceNote    | String?          | Evidence-Collection-Stub                 |
| refundOffered   | Boolean          | default false                            |
| createdAt/updatedAt | DateTime     |                                          |

Indizes: `@@index([status, createdAt])`, `@@index([campaignId])`.

## Neu: CampaignFlag

Community-Report von der Kampagnen-Seite (optional anonym).

| Feld           | Typ        | Notiz                                       |
|----------------|------------|---------------------------------------------|
| id             | String cuid| PK                                          |
| campaignId     | String     | FK → Campaign.id (Cascade)                  |
| reporterUserId | String?    | FK → User.id (SetNull); null = anonym       |
| visitorId      | String?    | anonymer Client-Identifier (kein PII/IP)    |
| reason         | FlagReason | default OTHER                               |
| note           | String?    |                                             |
| status         | FlagStatus | default OPEN                                |
| createdAt      | DateTime   | @default(now())                             |

Indizes: `@@index([campaignId, createdAt])`, `@@index([status])`.

## Geändert: Campaign

| Feld         | Typ       | Notiz                                            |
|--------------|-----------|--------------------------------------------------|
| frozen       | Boolean   | default false; Freeze-Gate (T&S)                 |
| frozenAt     | DateTime? |                                                  |
| freezeReason | String?   |                                                  |

Relationen: `moderationCase ModerationCase?`, `flags CampaignFlag[]`,
`chargebacks Chargeback[]`, `fraudSignals` (weich, kein FK).

## Geändert: User

| Feld         | Typ       | Notiz                                            |
|--------------|-----------|--------------------------------------------------|
| frozen       | Boolean   | default false; Donor-Konto-Freeze                |
| frozenAt     | DateTime? |                                                  |
| freezeReason | String?   |                                                  |
| riskScore    | Int       | default 0; letzter Donor-Risk-Score              |
| riskLevel    | RiskLevel | default LOW                                      |

Relationen: `fraudSignals FraudSignal[]` (Relation "DonorFraud"),
`moderationReviews ModerationCase[]` (Relation "ModerationReviewer"),
`campaignFlags CampaignFlag[]` (Relation "FlagReporter").

## Geändert: Donation

Relationen: `fraudSignals FraudSignal[]`, `chargebacks Chargeback[]`. Keine neue
Spalte (Geografie nutzt das bestehende `donorCountry` aus E8).

## Keine Schema-Änderung für

- Den Audit-Trail aller Moderations-Aktionen: nutzt die **bestehende** E6
  `AuditLog` (`AuditService.record`/`.list`) — keine neue Tabelle.
- Fraud-/Card-Testing-/Velocity-/Donor-Scoring, Moderation-Auto-Flag,
  Auto-Freeze-Entscheidung, OFAC-/Keyword-/Duplicate-Match, Chargeback-Regeln,
  Dashboard-Aggregation, Risk-Heat-Map — alles pure/zustandslos.
- Den E7-Analytics-Stream: Fraud-/Chargeback-Signale werden in die **bestehende**
  `AnalyticsEvent`-Tabelle (`AnalyticsService`) geschrieben.
