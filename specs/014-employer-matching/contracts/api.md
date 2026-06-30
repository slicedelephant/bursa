# API Contract 014 — Employer Matching Auto-Detection (E13)

Alle Antworten im Standard-Envelope `{ success, data }` (Fehler:
`{ success:false, error:{ code, message } }`). Geld in Integer-Cents. Locale
optional (`en|de|fr|es`, Default `en`).

## Öffentliche / Donor-Endpunkte (`/matching`)

### `POST /matching/detect`

Detektiert das Arbeitgeber-Match-Programm aus einer Arbeits-E-Mail. Eingeloggte
DONOR (OptionalJwtAuthGuard) bekommen ihren Arbeitgeber im Account persistiert;
anonyme Detection ist erlaubt.

Body: `DetectMatchDto` `{ workEmail: string, locale?: Locale }`.
Response `data`: `MatchOfferView` (mit `eligible:false`, falls keine Domain passt).

### `POST /matching/offer`

Berechnet das lokalisierte Match-Angebot für eine konkrete Spende (vor dem Claim).

Body: `MatchOfferDto` `{ campaignId: string, donationCents: number, workEmail?: string,
locale?: Locale }`. Wenn `workEmail` fehlt und ein DONOR eingeloggt ist, wird dessen
`employerDomain` genutzt.
Response `data`: `MatchOfferView`.

### `POST /matching/claim`

Claimt den Match: legt einen `MatchClaim` an (idempotent je `donationId`), erzeugt
das Claim-Artefakt (Antragslink **oder** PDF-Referenz) und bucht die committeten
Match-Mittel als CORPORATE-Spende auf die Kampagne (gekappt wie E2). Verbucht den
Betrag gegen die Jahres-Balance des Spenders.

Auth: `OptionalJwtAuthGuard` (eingeloggte DONOR werden zugeordnet; anonyme Claims
ohne Balance-Tracking erlaubt).
Body: `ClaimMatchDto` `{ donationId: string, workEmail?: string, locale?: Locale }`.
Response `data`: `MatchClaimView`.

### `GET /matching/me/balance`

Verbleibendes Jahres-Match-Limit + Claim-History des eingeloggten DONOR.

Auth: `JwtAuthGuard` + `RolesGuard` (Role `DONOR`).
Response `data`: `MatchBalanceView`.

### `GET /matching/me/claims/:id/document`

Lädt die Claim-Bestätigungs-PDF (nur für `MANUAL`-Level-Claims). `Content-Type:
application/pdf`.

Auth: `JwtAuthGuard` + `RolesGuard` (Role `DONOR`); Claim muss dem Spender gehören.

## View-Shapes

```ts
type Locale = 'en' | 'de' | 'fr' | 'es';
type MatchClaimStatus =
  | 'DETECTED' | 'OFFERED' | 'CLAIMED'
  | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

interface MatchOfferView {
  eligible: boolean;
  employerName?: string;
  domain?: string;
  matchRatio?: number;        // ×100
  matchCents?: number;        // für die konkrete Spende, gekappt
  remainingAnnualCents?: number;
  annualCapCents?: number;
  integrationLevel?: 'AUTO_SUBMIT' | 'PORTAL' | 'MANUAL';
  capped?: boolean;           // durch Jahres-Limit gedeckelt
  labels: {                   // lokalisiert
    headline: string;
    cta: string;
    balance: string;
  };
}

interface MatchClaimView {
  id: string;
  status: MatchClaimStatus;
  employerName: string;
  matchCents: number;
  campaignId: string;
  applyUrl?: string;          // Link-Level
  hasPdf: boolean;            // MANUAL-Level
  documentUrl?: string;       // /matching/me/claims/:id/document
  remainingAnnualCents?: number;
  labels: { headline: string; status: string };
}

interface MatchBalanceView {
  employerName?: string;
  domain?: string;
  year: number;
  annualCapCents?: number;
  usedCents: number;
  remainingAnnualCents?: number;
  claims: {
    id: string;
    employerName: string;
    matchCents: number;
    status: MatchClaimStatus;
    campaignTitle: string;
    schoolName: string;
    createdAt: string;
  }[];
}
```

## Error Codes

- `VALIDATION_ERROR` (400) — ungültige E-Mail/Body am Boundary.
- `NOT_FOUND` (404) — Kampagne/Spende/Claim nicht gefunden.
- `FORBIDDEN` (403) — Claim/Dokument gehört nicht dem Spender.
- `NOT_ELIGIBLE` (409) — Domain ohne aktives Programm bzw. Spende unter
  `minDonationCents`.
- `NO_MATCH_BUDGET` (409) — verbleibendes Jahres-Limit ist 0.
- `CLAIM_EXISTS` (409) — diese Spende wurde bereits geclaimt (idempotent-Guard).
