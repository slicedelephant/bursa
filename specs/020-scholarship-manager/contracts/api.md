# API Contracts — Feature 020 Scholarship Program Manager (E19)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Owner-Routen: `JwtAuthGuard` + `RolesGuard`, `@Roles(Role.SPONSOR)`; `userId` aus dem JWT
(`@CurrentUser('id')`). Die `/apply/:token`-Routen sind **öffentlich** (kein Login),
gegatet über den gehashten Application-Token. **Die Award-Auszahlung geht immer an die
Schule (E2/E12) und wird im append-only Ledger festgehalten — nie an den Scholar.**

## Programm-Admin (`@Controller('scholarship')`, `@Roles(SPONSOR)`)

### POST /scholarship/programs
Body:
```json
{ "name": "Acme Future Leaders Scholarship", "slug": "acme-future-leaders",
  "logoUrl": "https://cdn/acme.png", "brandPrimary": "#123456",
  "brandSecondary": "#abcdef", "tagline": "Investing in tomorrow's MBAs",
  "year": 2026, "budgetCents": 6000000, "slots": 3, "awardCents": 2000000 }
```
```json
{ "success": true, "data": { "id": "prg_…", "slug": "acme-future-leaders",
  "activeCycle": { "year": 2026, "budgetCents": 6000000, "slots": 3 } } }
```
→ `409 { "success": false, "error": "SLUG_TAKEN" }` bei belegtem Slug.

### GET /scholarship/programs · GET /scholarship/programs/:id
Liste bzw. Detail (Branding, aktiver Cycle, Zähler). `403` fremdes Programm.

### PUT /scholarship/programs/:id/form
Body:
```json
{ "title": "Application 2026", "intro": "Tell us about yourself.",
  "fields": [
    { "fieldKey": "why", "label": "Why do you deserve this?", "type": "LONG_TEXT",
      "required": true, "rubricWeight": 3 },
    { "fieldKey": "leadership", "label": "Leadership role", "type": "SELECT",
      "required": true, "options": ["None", "Team lead", "Founder"], "rubricWeight": 2 },
    { "fieldKey": "founderStory", "label": "Describe your venture", "type": "LONG_TEXT",
      "required": true, "rubricWeight": 2, "showIfFieldId": "leadership",
      "showIfValue": "Founder" } ] }
```
```json
{ "success": true, "data": { "formId": "frm_…", "fieldCount": 3 } }
```
→ `400 { "success": false, "error": "INVALID_FORM_SCHEMA" }` (Details im Fehlerobjekt:
doppelte Keys, SELECT ohne Optionen, Conditional-Ref zeigt ins Leere).

### POST /scholarship/programs/:id/reviewers
Body: `{ "reviewerName": "Dana Cole", "reviewerEmail": "dana@acme.test" }`
→ `{ "success": true, "data": { "reviewerId": "rev_…" } }`.
→ `409 { "success": false, "error": "REVIEWER_LIMIT" }` bei > 10 Reviewern.

### GET /scholarship/programs/:id/applications
```json
{ "success": true, "data": [
  { "id": "app_…", "applicantName": "Amara O.", "status": "UNDER_REVIEW",
    "consensusScore": 82, "answerCount": 3 } ] }
```

### POST /scholarship/applications/:id/scores
Body: `{ "reviewerId": "rev_…", "scores": [ { "fieldKey": "why", "score": 4,
  "comment": "Strong" }, { "fieldKey": "leadership", "score": 5 } ] }`
```json
{ "success": true, "data": { "consensusScore": 82 } }
```
→ `400 SCORE_OUT_OF_RANGE` (Score außerhalb 0–5) · `403` fremdes Programm.

### POST /scholarship/programs/:id/decide
Body: `{ "cycleYear": 2026 }` (nutzt Budget/Slots/awardCents des Cycles).
```json
{ "success": true, "data": { "winners": [ { "applicationId": "app_…",
  "amountCents": 2000000 } ], "spentCents": 6000000 } }
```

### POST /scholarship/awards/:id/disburse
Zahlt Tranche 1 **an die Schule** (`createPayout`) + Ledger-`DISBURSEMENT`.
```json
{ "success": true, "data": { "awardId": "awd_…", "schoolId": "sch_…",
  "amountCents": 2000000, "payoutRef": "mock_payout_…", "ledgerRefId": "led_…" } }
```
→ `409 SCHOOL_NOT_VERIFIED` (Schule nicht `payoutVerified`) · `409 ALREADY_DISBURSED`.

### POST /scholarship/awards/:id/release-tranche
Body: `{ "gpa": 3.7 }` (aktueller GPA; Threshold liegt am Award).
```json
{ "success": true, "data": { "decision": "RELEASE", "schoolId": "sch_…",
  "trancheCents": 1000000, "tranchePayoutRef": "mock_payout_…" } }
```
→ `{ "success": true, "data": { "decision": "HELD", "reason": "GPA_BELOW_THRESHOLD" } }`
→ `409 NO_TRANCHE_CONFIGURED` · `409 TRANCHE_ALREADY_RELEASED`.

### GET /scholarship/programs/:id/scholars · PUT /scholarship/scholars/:id/status
Status-Body: `{ "event": "enroll" }` (`enroll`/`graduate`/`employ`/`withdraw`).
```json
{ "success": true, "data": { "scholarId": "scl_…", "status": "ENROLLED",
  "enrolledAt": "2026-09-01T00:00:00.000Z" } }
```
→ `400 INVALID_STATUS_TRANSITION`.

### POST /scholarship/scholars/:id/message
Body: `{ "channel": "WHATSAPP", "body": "Welcome to the program!" }` (E17-Messaging, Mock).
→ `{ "success": true, "data": { "sent": true, "ref": "mock_whatsapp_1" } }`.

### GET /scholarship/programs/:id/report.csv · report.pdf
Binär-Export (`@Res()`), Content-Type `text/csv` bzw. `application/pdf`. Enthält
Scholar-Outcomes + Diversity-Metriken (E14). Kein Envelope (Datei-Stream).

### POST /scholarship/programs/:id/renew
Body: `{ "budgetCents": 6600000, "slots": 3, "awardCents": 2200000 }`
```json
{ "success": true, "data": { "cycle": { "year": 2027 }, "fieldsCopied": 3 } }
```

## Public Application (`@Controller('apply')`, öffentlich, token-gegatet)

### GET /apply/:token
Formular-Schema + Conditional-Metadaten fürs Bewerbungsformular.
```json
{ "success": true, "data": { "program": { "name": "Acme …", "brandPrimary": "#123456" },
  "form": { "title": "Application 2026", "fields": [ … ] } } }
```
→ `401 { "success": false, "error": "INVALID_TOKEN" }` (unbekannt/abgelaufen/widerrufen).

### POST /apply/:token
Body: `{ "applicantName": "Amara O.", "applicantEmail": "amara@x.test",
  "answers": { "why": "…", "leadership": "Founder", "founderStory": "…" } }`
```json
{ "success": true, "data": { "applicationId": "app_…", "statusToken": "…" } }
```
→ `400 { "success": false, "error": "INVALID_ANSWERS" }` (Pflichtfeld fehlt, Typ falsch,
SELECT-Wert nicht erlaubt — unsichtbare Felder werden übersprungen).

### GET /apply/:token/status
```json
{ "success": true, "data": { "status": "UNDER_REVIEW" } }
```

## Fehler-Format
```json
{ "success": false, "error": "SCHOOL_NOT_VERIFIED" }
```
- Falsche Rolle → `403` (RolesGuard). Fehlender/ungültiger JWT → `401`.
- Domain-Verstöße → `400`/`409` mit `DomainException`-Code (Codes siehe oben).
- Ungültiger Application-Token → `401 INVALID_TOKEN`.

## Messaging (intern, kein Endpoint)
Scholar-Kommunikation baut eine `OutboundMessage { channel, to, body }` und ruft
`MessagingProvider.send(...)` (E17). Default `MockMessagingProvider` (deterministisch, kein
Netz); Tests injizieren immer den Mock.
