# API Contracts — Feature 009 School-Self-Serve-Portal (E8)

Alle Responses folgen dem Envelope `{ success, data?, error? }`.
Fehler: `{ success: false, error: { code, message, details? } }`.

## School-Admin-Portal (JWT, Rolle `SCHOOL_ADMIN`, auf eigene Schule skopiert)

### GET /api/school/me
Schulprofil + Onboarding-State. IBAN maskiert (`ibanMasked: "•••• 3000"`).
```
200 { success:true, data:{
  school:{ id, name, country, city, website, logoUrl, slug,
           onboardingStatus, payoutVerified, bankAccountName, ibanMasked,
           bic, taxId, contactName, contactEmail },
  onboarding:{ status, progressPct, checklist:[{key,label,done}],
               agreementSignedAt, agreementSignerName } } }
```
Kein Schul-Link → `403 FORBIDDEN`.

### GET /api/school/dashboard
```
200 { success:true, data:{
  totals:{ totalStudents, liveCampaigns, fundedCampaigns, totalGoalCents,
           totalRaisedCents, totalPaidOutCents, pendingPayoutCents },
  students:[{ campaignId, studentName, title, goalCents, raisedCents,
              progressPct, payoutStatus }],
  donorGeography:[{ country, donationCount, amountCents }] } }
```

### PUT /api/school/payout
Body: `{ bankAccountName, iban, bic?, taxId, contactName, contactEmail }`.
Speichert Auszahlungsdaten; setzt `onboardingStatus` von NOT_STARTED auf
IN_PROGRESS. → `200` (aktualisierte Schule).

### POST /api/school/agreement/sign
Body: `{ signerName }`. Erfordert vollständige Auszahlungsdaten, sonst
`409 PAYOUT_INCOMPLETE`. Erfolg → Mock-e-Signatur, `onboardingStatus = ACTIVE`,
`payoutVerified = true`. → `200`.

### POST /api/school/admissions/import
Body: `{ csv }` (Header `email,name,program,admissionRef`). Upsert auf
`(schoolId, admissionRef)`. →
`200 { success:true, data:{ imported, duplicates, errors:[{line,message}] } }`.

### GET /api/school/admissions?status=PENDING|VERIFIED|REJECTED
→ `200` Liste der `AdmissionRecord` (optional gefiltert).

### POST /api/school/admissions/:id/verify
Konsultiert die (gemockte) Registrar-Naht; unbekannte Ref →
`409 ADMISSION_NOT_ON_FILE`. Erfolg → Status VERIFIED, emittiert
`student.reported`. → `200`.

### POST /api/school/admissions/:id/reject
Body: `{ note }` (min. 1 Zeichen). → Status REJECTED, emittiert
`student.reported`. → `200`. Fremder/fehlender Datensatz → `404 NOT_FOUND`.

### GET /api/school/campaigns
Kampagnen der eigenen Schule mit Status `PENDING_VERIFICATION`
(inkl. studentProfile, verification). → `200`.

### POST /api/school/campaigns/:id/approve
Body: `{ admissionRef?, note? }`. Nur wenn Schule ACTIVE + payout-verifiziert
(`409 SCHOOL_NOT_ACTIVE`). Setzt Zulassung VERIFIED, Kampagne LIVE, System-
Update; emittiert `campaign.approved`. → `200`.

### POST /api/school/campaigns/:id/reject
Body: `{ note }`. Setzt Zulassung REJECTED, Kampagne REJECTED. → `200`.

### GET /api/school/webhooks
→ `200` letzte Schul-Webhook-Events (`{ id, type, status, payload, createdAt }`).

## Hosted Onboarding (öffentlich, Token-gegated — kein JWT)

### GET /api/school/onboarding/:token
Validiert den Token. →
`200 { success:true, data:{ schoolId, schoolName, country, onboardingStatus } }`.
Ungültig/abgelaufen/benutzt/Mismatch → `400 INVALID_TOKEN`.

### POST /api/school/onboarding/:token/complete
Body: `{ bankAccountName, iban, bic?, taxId, contactName, contactEmail,
signerName }`. Setzt Auszahlungsdaten + Mock-e-Signatur, `onboardingStatus =
ACTIVE`, `payoutVerified = true`, verbraucht den Token (`usedAt`) — transaktional.
→ `200 { success:true, data:{ schoolId, schoolName, onboardingStatus } }`.

## Admin (Plattform, JWT, Rolle `ADMIN`)

### POST /api/schools/:id/onboarding-link
Body: `{ expiresInHours? }` (1-720, default 168). Erzeugt einen Einmal-Token,
speichert nur den Hash. →
`200 { success:true, data:{ token, path:"/school/onboarding/<token>", expiresAt } }`.

## Cross-cutting (bestehend, erweitert)

- `POST /api/admin/campaigns/:campaignId/payout` (ADMIN) — unverändert im
  Verhalten; emittiert zusätzlich `payout.sent` (fire-and-forget, bricht den
  Disburse-Pfad nie).

## Fehlercodes (neu)

`FORBIDDEN` (kein Schul-Link), `NOT_FOUND` (Schule/Datensatz/Kampagne),
`PAYOUT_INCOMPLETE`, `SCHOOL_NOT_ACTIVE`, `ADMISSION_NOT_ON_FILE`,
`INVALID_TOKEN`.
