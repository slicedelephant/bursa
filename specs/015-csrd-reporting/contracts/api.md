# API Contracts — Feature 015 CSRD-Reporting (E14)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Die Export-Routen streamen `text/csv` bzw. `application/pdf` direkt via `@Res()`
(bypassen den Interceptor). Admin-Routen: `JwtAuthGuard` + `RolesGuard` + `@Roles(ADMIN)`.
Das Audit-Portal ist öffentlich, aber token-gegatet und **read-only**.

## Admin — Compliance-Tagging

### POST /admin/esg/tags
Taggt einen Ledger-Eintrag mit einer ESG-Kategorie (additiv, Eintrag unverändert).
```json
// Request
{ "ledgerEntryId": "clx…", "category": "QUALITY_EDUCATION", "note": "Tuition cohort 2026" }
// 201 data
{ "id": "clt…", "ledgerEntryId": "clx…", "category": "QUALITY_EDUCATION", "note": "…", "createdAt": "2026-06-30T…Z" }
```
- `category` ∉ `EsgCategory` → **400**. Unbekannte `ledgerEntryId` → **404**.
- Re-Tag desselben Eintrags ersetzt das vorhandene Tag (idempotent).

## Admin — Diversity-Capture

### PUT /admin/esg/diversity/:studentProfileId
Setzt optionale Diversity-Felder. Alle Felder optional.
```json
// Request
{ "gender": "FEMALE", "birthYear": 1998, "firstGen": true }
// 200 data
{ "studentProfileId": "clp…", "gender": "FEMALE", "birthYear": 1998, "firstGen": true }
```
- `gender` ∉ `Gender` → **400**. `birthYear` außerhalb [1900, currentYear] → **400**.

## Admin — Report-Builder

### GET /admin/esg/report?standard=GRI_2024&year=2026
Erzeugt (ohne Persistenz) den gemappten Report für Standard + Jahr.
```json
// 200 data
{
  "standard": "GRI_2024",
  "period": { "start": "2026-01-01T00:00:00Z", "end": "2026-12-31T23:59:59Z" },
  "metrics": [
    { "code": "GRI 201-1", "label": "Economic value distributed", "value": 125000.0, "unit": "EUR", "note": "From 42 ledger DONATION entries" },
    { "code": "GRI 405-1", "label": "Diversity of recipients", "value": 35.0, "unit": "% female", "note": "20 of 57 scholars" }
  ],
  "annotations": [
    { "ref": 1, "entryHash": "ab12…", "sequence": 7, "amountCents": 250000, "reason": "tuition disbursement" }
  ]
}
```
- `standard` ∉ `ReportStandard` → **400**. Fehlendes `year` → default laufendes Jahr.

### POST /admin/esg/reports
Persistiert einen Report-Snapshot.
```json
// Request
{ "standard": "CSRD_ESRS", "year": 2026 }
// 201 data
{ "id": "cre…", "standard": "CSRD_ESRS", "periodStart": "2026-01-01T…Z", "periodEnd": "2026-12-31T…Z", "createdAt": "…" }
```

### GET /admin/esg/reports
Liste persistierter Reports (neueste zuerst).
```json
// 200 data
[ { "id": "cre…", "standard": "CSRD_ESRS", "periodStart": "…", "periodEnd": "…", "createdAt": "…" } ]
```

### GET /admin/esg/reports/:id/export.csv
`text/csv` Download mit Audit-Annotation-Fußnoten. **Kein** Envelope (via `@Res()`).

### GET /admin/esg/reports/:id/export.pdf
`application/pdf` Download (E5 `buildSimplePdf`) mit Fußnoten auf Quell-`entryHash`.

## Admin — Data-Quality

### GET /admin/esg/data-quality
```json
// 200 data
{
  "fields": [
    { "field": "gender", "captured": 48, "total": 57, "pct": 84.2, "collectMore": false },
    { "field": "country", "captured": 57, "total": 57, "pct": 100.0, "collectMore": false },
    { "field": "birthYear", "captured": 9, "total": 57, "pct": 15.8, "collectMore": true }
  ],
  "overallPct": 66.7
}
```

## Admin — Year-over-Year Trend

### GET /admin/esg/trend
```json
// 200 data
{
  "years": [
    { "year": 2025, "investedEur": 80000.0, "scholarCount": 30, "femaleSharePct": 33.3 },
    { "year": 2026, "investedEur": 125000.0, "scholarCount": 57, "femaleSharePct": 35.1 }
  ],
  "deltas": [
    { "year": 2026, "investedEurDelta": 45000.0, "scholarCountDelta": 27, "femaleShareDeltaPct": 1.8 }
  ]
}
```

## Admin — Auditor-Access-Grants

### POST /admin/esg/auditor-grants
```json
// Request
{ "label": "PwC Q1 audit", "ttlHours": 48, "scope": "school:clp…" }
// 201 data — RAW TOKEN NUR HIER (einmalig)
{ "id": "cag…", "label": "PwC Q1 audit", "token": "9f3a…(64 hex)", "expiresAt": "2026-07-02T…Z", "portalUrl": "/audit-portal/9f3a…" }
```
- `ttlHours` außerhalb [1, 168] → **400** (default 48).

### POST /admin/esg/auditor-grants/:id/revoke
```json
// 200 data
{ "id": "cag…", "revokedAt": "2026-06-30T…Z" }
```

### GET /admin/esg/auditor-grants
Liste der Grants (ohne Token, mit Status).
```json
// 200 data
[ { "id": "cag…", "label": "PwC Q1 audit", "expiresAt": "…", "revokedAt": null, "lastUsedAt": null, "status": "ACTIVE" } ]
```

## Öffentlich — Audit-Portal (token-gegatet, read-only)

### GET /audit-portal/:token
Liefert einen read-only Audit-Trail-Auszug (Ledger-Einträge + Tags + Integritäts-Status).
```json
// 200 data
{
  "grantLabel": "PwC Q1 audit",
  "expiresAt": "2026-07-02T…Z",
  "integrity": { "valid": true, "checkedCount": 120, "brokenAtSequence": null },
  "entries": [
    { "sequence": 7, "entryType": "PAYOUT", "amountCents": 250000, "currency": "EUR", "reason": "tuition disbursement", "entryHash": "ab12…", "category": "QUALITY_EDUCATION", "createdAt": "…" }
  ]
}
```
- Malformed/unbekannter Token → **401**. Abgelaufen → **401**. Widerrufen → **403**.
- **Nie Schreibzugriff** über diesen Pfad.

## Fehlerformat (JSON-Routen)
```json
{ "success": false, "error": "category must be a valid EsgCategory" }
```
