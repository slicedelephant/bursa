# Data Model 012 — Automated KYC & Verification Pipeline (E11)

Alle neuen Entitäten sind additiv. Money-/Verifikations-Semantik bestehender Modelle
(E8 `AdmissionRecord`, Geld-Pfad) bleibt unangetastet. Geld weiterhin nur an die Schule.

## Neue Enums

### VerificationSubject
Wer wird verifiziert.

```
STUDENT
SPONSOR
```

### VerificationCaseStatus
Status des Verifikations-Vorgangs (Übergänge in `verification-state.ts`).

```
STARTED            // Vorgang angelegt
LIVENESS_PASSED    // Liveness bestanden
DOCUMENT_VERIFIED  // Dokument + Namensabgleich ok
AML_CLEARED        // AML (Sponsor) ohne Treffer
VERIFIED           // automatisch komplett verifiziert
MANUAL_REVIEW      // Ausnahme → Operator-Queue
REJECTED           // abgelehnt (auto oder manuell)
```

### ReviewQueueStatus
Status in der Manual-Review-Queue.

```
NOT_REQUIRED  // kein Mensch nötig
PENDING       // wartet auf Operator
APPROVED      // Operator hat freigegeben
REJECTED      // Operator hat abgelehnt
```

### AmlDecision
Ergebnis der AML-Entscheidung (`aml-decision.ts`).

```
CLEAR    // kein Treffer
HIT      // Treffer → Manual-Review
BLOCKED  // sanktioniertes Land → harter Block
```

## Neue Modelle

### VerificationCase
Der zentrale Vorgang. Eine Zeile pro Verifikation.

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| subjectType | VerificationSubject | STUDENT / SPONSOR |
| subjectUserId | String | weiche fachliche Referenz auf User (FK, Cascade) |
| admissionRecordId | String? | optionaler E8-Bezug für den Dokument-Abgleich |
| status | VerificationCaseStatus | Default STARTED |
| reviewQueueStatus | ReviewQueueStatus | Default NOT_REQUIRED |
| riskScore | Int | 0-100, Default 0 |
| riskLevel | RiskLevel | wiederverwendetes E9-Enum, Default LOW |
| decisionNote | String? | Operator-Notiz / Auto-Begründung |
| reviewedById | String? | Operator (User), SetNull |
| reviewedAt | DateTime? | |
| createdAt / updatedAt | DateTime | |

Relationen: `user` (subjectUserId → User, Cascade), `reviewedBy` (User, SetNull),
`admissionRecord` (AdmissionRecord, SetNull), `liveness` (LivenessResult?),
`document` (DocumentVerification?), `aml` (AmlScreening?).
Index: `[reviewQueueStatus, riskScore]`, `[subjectUserId]`.

### LivenessResult
Ergebnis des Liveness-Schritts (1:1 zu Case).

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| caseId | String @unique | 1:1 |
| provider | String | "mock" / "persona" |
| confidence | Int | 0-100 |
| passed | Boolean | confidence >= Schwelle |
| reference | String | Provider-Referenz |
| createdAt | DateTime | |

### DocumentVerification
Ergebnis des Dokument-Schritts (1:1 zu Case).

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| caseId | String @unique | 1:1 |
| provider | String | "mock" / "persona" |
| extractedName | String | aus Mock-OCR |
| extractedSchool | String? | aus Mock-OCR |
| extractedDegree | String? | aus Mock-OCR |
| nameMatchScore | Int | 0-100 (Levenshtein-Ähnlichkeit) |
| matched | Boolean | nameMatchScore >= Schwelle |
| registrarConfirmed | Boolean | E8-Registrar bestätigt (falls admissionRecordId) |
| reference | String | Provider-Referenz |
| createdAt | DateTime | |

### AmlScreening
Ergebnis des AML-Schritts für Sponsoren (1:1 zu Case).

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| caseId | String @unique | 1:1 |
| provider | String | "mock" / "sumsub" |
| amountCents | Int | geprüfter Betrag |
| country | String | ISO alpha-2 |
| decision | AmlDecision | CLEAR / HIT / BLOCKED |
| reasons | Json | Begründungen (string[]) |
| reference | String | Provider-Referenz |
| createdAt | DateTime | |

## Bestehende Modelle (erweitert)

### User
Neue Relation `verificationCases VerificationCase[] @relation("VerificationSubject")` und
`verificationReviews VerificationCase[] @relation("VerificationReviewer")`. Keine neuen
Money-/Verifikations-Felder.

### AdmissionRecord (E8)
Neue Rück-Relation `verificationCases VerificationCase[]`. Keine Änderung an Feldern oder
Verifikations-Semantik.

## Audit (wiederverwendet, kein neues Modell)

Jede Entscheidung wird über das E6 `AuditLog` protokolliert:

| Feld | Wert |
|---|---|
| action | `kyc.liveness.passed` / `kyc.liveness.failed` / `kyc.document.verified` / `kyc.document.mismatch` / `kyc.aml.clear` / `kyc.aml.hit` / `kyc.aml.blocked` / `kyc.risk.scored` / `kyc.case.verified` / `kyc.review.approved` / `kyc.review.rejected` |
| actorUserId | Operator-/System-User |
| targetType | `VerificationCase` |
| targetId | caseId |
| metadata | Score/Decision/Reasons (PII-redigiert durch AuditService) |
