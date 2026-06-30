# Data Model 014 — Employer Matching Auto-Detection (E13)

Geld in Integer-Cents (EUR). IDs `cuid()`. Neu sind ein Enum, zwei Modelle und vier
additive Felder am bestehenden `User`. Der Money-Pfad (Donation/Campaign/Payout)
bekommt **keine** neuen Felder; der committete Match nutzt die bestehende
`Donation`-Form.

## Neue Enums

### MatchClaimStatus

Lifecycle eines Match-Claims (State-Machine in `claim-status.ts`):

- `DETECTED` — Arbeitgeber-Programm erkannt, noch kein Angebot bestätigt.
- `OFFERED` — Angebot dem Spender im Checkout gezeigt.
- `CLAIMED` — Spender hat geclaimt; Match-Mittel auf die Kampagne committet.
- `SUBMITTED` — Antrag (Link/PDF) wurde generiert / als eingereicht markiert.
- `APPROVED` — Arbeitgeber hat den Match bestätigt (Prototyp: manuell/Demo).
- `REJECTED` — Arbeitgeber hat abgelehnt.
- `EXPIRED` — Claim-Fenster verstrichen.

### EmployerIntegrationLevel

Integrations-Tiefe eines Programms (steuert das Claim-Artefakt):

- `AUTO_SUBMIT` — pre-filled Antragslink, DTD-Auto-Submission-Beta (Prototyp: Link).
- `PORTAL` — pre-filled Antragslink zum HR-/Matching-Portal.
- `MANUAL` — Claim-Bestätigungs-PDF (E5-`buildSimplePdf`).

## Neue Modelle

### EmployerMatchProgram

Ein bekanntes Arbeitgeber-Matching-Programm (statisch / über Seed gepflegt; der
Mock-Provider hält dieselbe Liste in-memory für Tests).

| Feld              | Typ                      | Notes                                   |
|-------------------|--------------------------|-----------------------------------------|
| id                | String cuid PK           |                                         |
| domain            | String @unique           | registrierbare Domain, z. B. `sap.com`  |
| employerName      | String                   | Anzeige-Name, echte Sonderzeichen       |
| matchRatio        | Int                      | ×100, 100 = 1:1, 200 = 2:1              |
| annualCapCents    | Int                      | Jahres-Cap je Spender                   |
| minDonationCents  | Int @default(0)          | Mindest-Spende für Eligibility          |
| integrationLevel  | EmployerIntegrationLevel | AUTO_SUBMIT / PORTAL / MANUAL           |
| applyUrlTemplate  | String?                  | `{amount}`/`{employer}`-Platzhalter     |
| active            | Boolean @default(true)   |                                         |
| createdAt         | DateTime @default(now()) |                                         |

Relationen: `claims MatchClaim[]`.

### MatchClaim

Ein Claim eines Spenders gegen ein Programm — idempotent je Spende.

| Feld            | Typ                       | Notes                                       |
|-----------------|---------------------------|---------------------------------------------|
| id              | String cuid PK            |                                             |
| donationId      | String @unique            | die auslösende Spende (idempotent)          |
| matchDonationId | String? @unique           | die committete CORPORATE-Match-Spende       |
| programId       | String                    | → EmployerMatchProgram                      |
| donorUserId     | String?                   | weiche Referenz auf den DONOR (E4)          |
| campaignId      | String                    | Empfänger-Kampagne                          |
| employerName    | String                    | Snapshot zum Claim-Zeitpunkt                |
| matchCents      | Int                       | committeter (gekappter) Match               |
| status          | MatchClaimStatus          | @default(CLAIMED)                           |
| applyUrl        | String?                   | pre-filled Antragslink (Link-Level)         |
| pdfRef          | String?                   | Referenz der Claim-PDF (MANUAL)             |
| year            | Int                       | Kalenderjahr des Claims                     |
| createdAt       | DateTime @default(now())  |                                             |
| updatedAt       | DateTime @updatedAt       |                                             |

Relationen: `program`, `donor User?`, `campaign`, `donation` (auslösend),
`matchDonation Donation?` (committet). Indizes: `[donorUserId, createdAt]`,
`[campaignId]`, `[status]`.

## Bestehende Modelle (erweitert)

### User (E4 — additive Felder)

| Feld            | Typ                    | Notes                                       |
|-----------------|------------------------|---------------------------------------------|
| employerName    | String?                | detektierter Arbeitgeber                    |
| employerDomain  | String?                | detektierte Arbeits-Domain                  |
| matchYear       | Int?                   | Kalenderjahr der aktuellen Balance          |
| matchUsedCents  | Int @default(0)        | im `matchYear` bereits committeter Match    |

Neue Rück-Relation: `matchClaims MatchClaim[]`. Keine Änderung am Money-Pfad.

### Donation (E2 — wiederverwendet, nicht erweitert)

Die committete Match-Spende ist eine normale `Donation`: `type=CORPORATE`,
`method=SEPA`, `status=SUCCEEDED`, `donorName=employerName`,
`providerRef=mock_match_<claimId>`. Zwei neue Rück-Relationen (für `MatchClaim`):
`triggeredClaim MatchClaim?` (als auslösende Spende) und
`matchClaim MatchClaim?` (als committete Match-Spende). Keine neuen Money-Felder.

### Campaign (E2)

Empfänger; `raisedCents` wächst um den (Over-Funding-gekappten) Match-Betrag — exakt
dieselbe `splitContribution`-Kappung wie der reguläre Spenderpfad.

## Jahres-Balance-Mechanik

`remainingAnnualCents(program, user, now) = annualCap − (matchYear == year(now) ?
matchUsedCents : 0)`, geclamped auf `>= 0`. Beim Claim wird `matchYear` auf das
aktuelle Jahr gesetzt (Reset, falls Jahr gewechselt) und `matchUsedCents` um den
committeten Match erhöht — transaktional zusammen mit der Match-Spende.
