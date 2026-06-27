# Data Model — Feature 007 Security-Hardening

Migration: `security_hardening` (additiv — neue Tabelle + nullable Spalte, keine
Datenmigration nötig).

## Neu: AuditLog

Append-only Zugriffs-/Sicherheitsprotokoll.

| Feld         | Typ        | Notiz                                                        |
|--------------|------------|-------------------------------------------------------------|
| id           | String cuid| PK                                                          |
| action       | String     | z.B. `auth.login`, `auth.login_failed`, `account.export`, `account.delete`, `admin.verify` |
| actorUserId  | String?    | FK → User.id (SetNull); null bei anonym/system              |
| targetType   | String?    | z.B. `User`, `Campaign`                                     |
| targetId     | String?    | ID des betroffenen Objekts                                  |
| ip           | String?    | Quell-IP (für Velocity-/Forensik); PII-arm                  |
| metadata     | Json?      | Zusatzkontext, **vor Persistierung redacted**              |
| createdAt    | DateTime   | @default(now()), indexiert                                  |

Index: `@@index([action, createdAt])`, `@@index([actorUserId])`.

Relation auf User: `actor User? @relation("AuditActor", fields:[actorUserId], references:[id], onDelete: SetNull)`.

## Geändert: User

| Feld         | Typ        | Notiz                                                        |
|--------------|------------|-------------------------------------------------------------|
| anonymizedAt | DateTime?  | gesetzt bei GDPR-Löschung; markiert anonymisiertes Konto    |
| auditLogs    | AuditLog[] | Relation "AuditActor"                                       |

Anonymisierungs-Invariante (`account.delete`):
- `email`   → `deleted+<id>@bursa.invalid` (unique erhalten, nicht rückführbar)
- `displayName` → `"Deleted user"`
- `passwordHash` → neuer Zufalls-Hash (Login unmöglich)
- `anonymizedAt` → `now()`
- eigene `Donation`-PII: `donorName=null`, `message=null` (Betrag/Status/Refs bleiben)
- **nicht** gelöscht: Donation-, Invoice-, Recurring-, AuditLog-Datensätze (Geld-/Audit-Trail)

## Keine Schema-Änderung für

- Rate-Limiting (in-memory, kein State in DB)
- Security-Header, Webhook-Signatur, env-Validation, TOTP-Verifikation,
  Passwort-Policy, PII-Redaction — alles zustandslos/pure.
