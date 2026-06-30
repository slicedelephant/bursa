# API Contract 012 — Automated KYC & Verification Pipeline (E11)

Alle Antworten nutzen den globalen `{ success, data? }` / `{ success: false, error }`-Envelope.
Fehler tragen einen stabilen `code` (siehe unten). Geld weiterhin nur an die Schule.

## Student-Endpunkte (`/kyc`, JwtAuthGuard + RolesGuard, Role STUDENT)

### `POST /kyc/cases`
Startet einen Verifikations-Vorgang für den eingeloggten Studierenden.

Body:
```json
{ "admissionRecordId": "ckxyz..." }   // optional (E8-Bezug)
```
Response `data`: `VerificationCaseView` (status STARTED).

### `POST /kyc/cases/:id/liveness`
Führt den Liveness-Schritt aus (Mock).

Body:
```json
{ "livenessToken": "live_demo_ok" }   // endet auf "-FAIL" → fehlgeschlagen
```
Response `data`: `VerificationCaseView` (liveness gefüllt). Fehlschlag → Case `MANUAL_REVIEW`,
`reviewQueueStatus PENDING`. Auditiert (`kyc.liveness.*`).

### `POST /kyc/cases/:id/document`
Führt den Dokument-/OCR-Schritt aus (Mock-OCR + Fuzzy-Namensabgleich gegen Admission).

Body:
```json
{
  "documentToken": "doc_demo_ok",     // endet auf "-MISMATCH" → Namens-Mismatch
  "claimedName": "Amara Okonkwo"
}
```
Response `data`: `VerificationCaseView` (document gefüllt). Mismatch → `MANUAL_REVIEW`.
Auditiert (`kyc.document.*`).

### `GET /kyc/cases/me`
Listet die Vorgänge des eingeloggten Studierenden (neueste zuerst).
Response `data`: `VerificationCaseView[]`.

## Sponsor-Endpunkte (`/kyc/aml`, Role SPONSOR)

### `POST /kyc/aml/screen`
AML-Screening für einen Sponsor-Beitrag. Läuft nur oberhalb der Schwelle (>5.000 EUR);
darunter `CLEAR` ohne Provider-Call.

Body:
```json
{ "amountCents": 600000, "country": "DE" }
```
Response `data`: `VerificationCaseView` (aml gefüllt, subjectType SPONSOR).
`BLOCKED` (sanktioniertes Land) → Case `REJECTED`. `HIT` → `MANUAL_REVIEW`. Auditiert
(`kyc.aml.*`).

## Operator-Endpunkte (`/kyc/review`, Role ADMIN)

### `GET /kyc/review/queue`
Listet die Manual-Review-Queue (`reviewQueueStatus=PENDING`), nach Risk-Score sortiert.
Query: `?status=PENDING|APPROVED|REJECTED` (optional).
Response `data`: `VerificationCaseView[]`.

### `GET /kyc/review/:id`
Ein einzelner Vorgang mit allen Schritt-Ergebnissen.
Response `data`: `VerificationCaseView`.

### `POST /kyc/review/:id/decide`
Operator entscheidet einen Queue-Fall.

Body:
```json
{ "decision": "APPROVE", "note": "Diploma matched manually" }   // APPROVE | REJECT
```
Response `data`: `VerificationCaseView`. Auditiert (`kyc.review.approved|rejected`).

### `GET /kyc/review/dashboard`
Aggregierte Kennzahlen: Anzahl je Status, Pending-Count, Risk-Verteilung.
Response `data`: `KycDashboardView`.

## View-Shapes

```ts
interface VerificationCaseView {
  id: string;
  subjectType: 'STUDENT' | 'SPONSOR';
  status: 'STARTED' | 'LIVENESS_PASSED' | 'DOCUMENT_VERIFIED' | 'AML_CLEARED'
        | 'VERIFIED' | 'MANUAL_REVIEW' | 'REJECTED';
  reviewQueueStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decisionNote: string | null;
  liveness: { provider: string; confidence: number; passed: boolean } | null;
  document: {
    provider: string; extractedName: string; nameMatchScore: number;
    matched: boolean; registrarConfirmed: boolean;
  } | null;
  aml: { provider: string; amountCents: number; country: string;
         decision: 'CLEAR' | 'HIT' | 'BLOCKED'; reasons: string[] } | null;
  createdAt: string;
}

interface KycDashboardView {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
  riskDistribution: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>;
}
```

## Error Codes

| Code | HTTP | Wann |
|---|---|---|
| `NOT_FOUND` | 404 | Case existiert nicht / gehört nicht dem Nutzer |
| `INVALID_STATE` | 409 | Schritt im falschen Status (z. B. Document vor Liveness) |
| `ALREADY_DECIDED` | 409 | Review-Fall ist nicht mehr PENDING |
| `AML_BLOCKED` | 422 | sanktioniertes Land → harter Block |
| `VALIDATION_ERROR` | 400 | DTO-Validierung fehlgeschlagen |
| `FORBIDDEN` | 403 | falsche Rolle |
