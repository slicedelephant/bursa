# API Contracts — 006 Corporate Channel

All JSON responses use the `{ success, data }` envelope, EXCEPT the two export
endpoints, which stream `text/csv` / `application/pdf` directly (via `@Res()`).
Auth: `SPONSOR` role unless noted. Errors: `{ success: false, error: { code, message } }`.

## POST /api/campaigns/:campaignId/corporate/sponsor

Create a corporate sponsorship (full-tuition / tier) for a live, verified campaign.

Body:
```json
{
  "amountCents": 2360000,          // optional if "tier" given (CUSTOM uses this)
  "tier": "FULL",                  // SEMESTER | YEAR | FULL | CUSTOM
  "method": "CARD",                // CARD (immediate) | SEPA (committed)
  "scholarshipName": "The Acme Capital Scholarship",  // optional
  "logoRecognition": true,         // opt-in => SPONSORING invoice w/ VAT
  "impactReportOptIn": true,       // optional
  "poNumber": "PO-2026-1187",      // optional
  "vatId": "DE123456789",          // optional
  "message": "Proud to support."   // optional
}
```

`data`:
```json
{
  "donation": { "id": "...", "amountCents": 2360000, "status": "SUCCEEDED" },
  "campaign": { "id": "...", "status": "FUNDED", "goalCents": 0, "raisedCents": 0, "percent": 100 },
  "sponsorship": { "id": "...", "tier": "FULL", "fullTuition": true, "scholarshipName": "...", "recognitionKind": "NAMED" },
  "invoice": { "invoiceNo": "BURSA-INV-2026-AB12CD34", "documentType": "SPONSORING", "netCents": 2360000, "vatCents": 448400, "grossCents": 2808400, "status": "PAID" },
  "capture": { "capturedIds": ["..."], "failedIds": [], "capturedCents": 12000 }  // present when full-tuition closed the gap
}
```

Errors: `404 NOT_FOUND` (campaign not donatable), `400 VALIDATION_ERROR`
(no company profile / bad body), `402 PAYMENT_FAILED` (mock sentinel `.13`),
`409 CAMPAIGN_FULLY_FUNDED`.

## GET /api/sponsors/me/esg

`data`:
```json
{
  "metrics": {
    "studentsSupported": 3,
    "countriesReached": 2,
    "schoolsSupported": 2,
    "totalCommittedCents": 4200000,
    "fullScholarships": 1,
    "namedScholarships": 1
  },
  "rows": [
    { "campaignTitle": "...", "studentName": "...", "studentCountry": "Nigeria", "schoolName": "INSEAD", "amountCents": 2360000, "tier": "FULL", "scholarshipName": "...", "createdAt": "..." }
  ]
}
```

## GET /api/sponsors/me/esg/export.csv

Streams `text/csv` (`Content-Disposition: attachment; filename="bursa-esg-report.csv"`).
Columns: Campaign, Student, Country, School, Amount (EUR), Tier, Scholarship, Date.

## GET /api/sponsors/me/esg/export.pdf

Streams `application/pdf` (single-page impact report:
title, sponsor name, metric lines, per-sponsorship lines).

## GET /api/sponsors/me/sponsorships/:id/invoice

`data`: the invoice document (`invoiceNo`, `documentType`, `netCents`,
`vatCents`, `grossCents`, `vatId`, `poNumber`, `status`, `companyName`,
`campaignTitle`, `schoolName`, `issuer`). `404 NOT_FOUND` / `403 FORBIDDEN`.

## POST /api/sponsors/me/sponsorships/:id/settle

Settle a SEPA invoice (PENDING → PAID, sets `settledAt`). `data`: updated invoice.
`409 CONFLICT` if not a pending SEPA invoice. `403 FORBIDDEN` if not owner.

## Campaign detail (extended)

`GET /api/campaigns/:id` `data` gains:
```json
{
  "recognition": [
    { "companyName": "Acme Capital", "logoUrl": null, "scholarshipName": "The Acme Capital Scholarship" }
  ]
}
```
Only non-anonymous sponsorships (LOGO or NAMED) appear.
