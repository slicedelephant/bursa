# Data Model — Feature 009 School-Self-Serve-Portal (E8)

Migration: `school_portal` (additiv — neue Tabellen, nullable Spalten und ein
zusätzlicher Enum-Wert; keine Datenmigration nötig).

## Geändert: enum Role

`+ SCHOOL_ADMIN` — an genau eine Schule gebundener Portal-Admin. Nicht
selbst-zuweisbar (RegisterDto erlaubt nur DONOR/STUDENT/SPONSOR).

## Neu: enum SchoolOnboardingStatus

`NOT_STARTED` → `IN_PROGRESS` → `SUBMITTED` → `ACTIVE`. Übergänge gehören der
puren `onboarding-status.ts`; ACTIVE + `payoutVerified` ist das Gate für
Kampagnen-Genehmigung.

## Neu: SchoolAdmin

| Feld      | Typ         | Notiz                                            |
|-----------|-------------|--------------------------------------------------|
| id        | String cuid | PK                                               |
| userId    | String      | unique, FK → User.id (Cascade)                   |
| schoolId  | String      | FK → School.id (Cascade)                         |
| createdAt | DateTime    | @default(now())                                  |

Index: `@@index([schoolId])`.

## Neu: AdmissionRecord

Importierte Zulassungszeile; eine VERIFIED-Zeile ist der Trust-Anker für
Live-Gang (Constitution II).

| Feld         | Typ                | Notiz                                    |
|--------------|--------------------|------------------------------------------|
| id           | String cuid        | PK                                       |
| schoolId     | String             | FK → School.id (Cascade)                 |
| studentEmail | String             | aus CSV (lowercased)                     |
| studentName  | String             |                                          |
| programName  | String             |                                          |
| admissionRef | String             | fachlicher Schlüssel                     |
| status       | VerificationStatus | PENDING/VERIFIED/REJECTED (default PENDING) |
| note         | String?            | Ablehnungsgrund                          |
| reviewedById | String?            | FK → User.id (SetNull)                   |
| reviewedAt   | DateTime?          |                                          |
| createdAt/updatedAt | DateTime    |                                          |

Constraints: `@@unique([schoolId, admissionRef])` (idempotenter Re-Import),
`@@index([schoolId, status])`.

## Neu: SchoolOnboardingToken

Einmal-Token für den hosted Flow; **nur der SHA-256-Hash** wird gespeichert.

| Feld      | Typ         | Notiz                                             |
|-----------|-------------|---------------------------------------------------|
| id        | String cuid | PK                                                |
| schoolId  | String      | FK → School.id (Cascade)                          |
| tokenHash | String      | unique (SHA-256 hex des Roh-Tokens)               |
| expiresAt | DateTime    |                                                   |
| usedAt    | DateTime?   | gesetzt beim `complete` (verbraucht)              |
| createdAt | DateTime    | @default(now())                                   |

Index: `@@index([schoolId])`.

## Neu: SchoolWebhookEvent

Geloggtes Schul-Event (Stub-Emitter; keine echte Auslieferung).

| Feld      | Typ         | Notiz                                             |
|-----------|-------------|---------------------------------------------------|
| id        | String cuid | PK                                                |
| schoolId  | String      | FK → School.id (Cascade)                          |
| type      | String      | `student.reported`/`campaign.approved`/`payout.sent` |
| status    | String      | default `LOGGED`                                  |
| payload   | Json        | volle Envelope                                    |
| createdAt | DateTime    | @default(now())                                   |

Index: `@@index([schoolId, createdAt])`.

## Geändert: School

| Feld                | Typ                    | Notiz                              |
|---------------------|------------------------|------------------------------------|
| slug                | String?                | unique, gebrandeter Portal-Handle  |
| onboardingStatus    | SchoolOnboardingStatus | default NOT_STARTED                |
| bankAccountName     | String?                | Auszahlungsdaten                   |
| iban                | String?                | in API-Antworten maskiert          |
| bic                 | String?                |                                    |
| taxId               | String?                |                                    |
| contactName         | String?                |                                    |
| contactEmail        | String?                |                                    |
| agreementSignedAt   | DateTime?              | Mock-e-Signatur                    |
| agreementSignerName | String?                |                                    |
| agreementRef        | String?                | `mock_esign_…`                     |

Relationen: `admins SchoolAdmin[]`, `admissionRecords AdmissionRecord[]`,
`onboardingTokens SchoolOnboardingToken[]`, `webhookEvents SchoolWebhookEvent[]`.

Aktivierungs-Invariante: Unterschrift bei vollständigen Auszahlungsdaten →
`onboardingStatus = ACTIVE`, `payoutVerified = true` (Gate für Kampagnen-LIVE).

## Geändert: Donation

| Feld         | Typ     | Notiz                                                    |
|--------------|---------|---------------------------------------------------------|
| donorCountry | String? | nur für die Dashboard-Geografie; nie Pflicht, nie PII-verknüpft |

## Geändert: User

`+ schoolAdmin SchoolAdmin?` und `+ reviewedAdmissions AdmissionRecord[]`
(Relation "AdmissionReviewer").

## Keine Schema-Änderung für

- Onboarding-Token-Validierung, Admission-CSV-Parsing, Onboarding-State-Machine,
  Payout-Status-Derivation, Dashboard-Aggregation, Webhook-Envelope-Builder,
  e-Signatur-/Registrar-Mock — alles zustandslos/pure bzw. in vorhandenen
  Tabellen.
