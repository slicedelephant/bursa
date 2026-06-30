# Data Model 013 — Payout-Reconciliation & Transparenz-Layer (E12)

Alle neuen Entitäten sind additiv. Money-/Verifikations-Semantik bestehender Modelle
(E2 `Payout`/`Donation`, E8 `School`, Geld-Pfad) bleibt unangetastet. Geld weiterhin
nur an die Schule.

## Neue Enums

### LedgerEntryType
Welche Geldbewegung ein Ledger-Eintrag repräsentiert.

```
DONATION       // eine gecapturte/erfolgreiche Spende ging ein
PAYOUT         // eine Auszahlung an die Schule wurde angestoßen
DISBURSEMENT   // die Auszahlung wurde als an der Schule angekommen bestätigt
```

### ReconciliationStatus
Zusammengefasster Status eines Reconciliation-Laufs / einer Payout-Zeile.

```
MATCHED        // System-Payout hat eine passende Bank-Transaktion
PENDING        // Payout gesendet, < 48h, noch keine Bank-Transaktion
UNMATCHED      // Payout gesendet, > 48h, keine Bank-Transaktion (Alert)
DISCREPANCY    // Bank-Transaktion gefunden, aber Betrag weicht ab
```

## Neue Modelle

### LedgerEntry
Der unveränderliche, append-only Ledger-Eintrag. **Kein `updatedAt`, kein Soft-Delete.**
Genau eine Zeile pro Geldbewegung, monoton über `sequence` je Schule, per Hash-Chain
verkettet.

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| sequence | Int | monoton je Schule (1,2,3,…) |
| entryType | LedgerEntryType | DONATION / PAYOUT / DISBURSEMENT |
| amountCents | Int | Betrag der Bewegung |
| currency | String | ISO, Default "EUR" |
| schoolId | String | Empfänger (Schule) — Geld geht nur an die Schule |
| actorUserId | String? | wer die Bewegung auslöste (System/Admin), SetNull |
| reason | String | menschenlesbarer Grund |
| refType | String? | z. B. "Payout" / "Donation" |
| refId | String? | weiche fachliche Referenz auf den Auslöser |
| prevHash | String | `entryHash` des Vorgänger-Eintrags der Schule ("" beim ersten) |
| entryHash | String | SHA-256 über die kanonischen Felder + prevHash |
| createdAt | DateTime | Default now() |

Relationen: `school` (schoolId → School, Cascade), `actor` (User?, SetNull).
Index: `@@unique([schoolId, sequence])`, `@@index([schoolId, createdAt])`,
`@@index([entryType])`.
Invariante: nur `create` + `read` — der `LedgerService` bietet keine Update-/Delete-API.

### BankTransaction
Eine vom Bank-Feed-Provider gelieferte Transaktion. Idempotent über
`(provider, externalId)`.

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| provider | String | "mock" / "plaid" |
| externalId | String | idempotente Provider-Transaktions-ID |
| schoolId | String | Konto-/Schul-Bezug |
| amountCents | Int | Betrag laut Bank |
| currency | String | ISO, Default "EUR" |
| reference | String? | Verwendungszweck / Referenz (für den Match) |
| postedAt | DateTime | Buchungsdatum laut Bank |
| matchedPayoutId | String? | optionaler Payout-Match (SetNull) |
| raw | Json? | Roh-Payload des Providers (illustrativ) |
| createdAt | DateTime | Default now() |

Relationen: `school` (schoolId → School, Cascade), `matchedPayout` (Payout?, SetNull).
Index: `@@unique([provider, externalId])`, `@@index([schoolId, postedAt])`.

### Reconciliation
Ein persistierter Reconciliation-Lauf je Schule (für Verlauf/Audit). Die Detail-Rows
werden zur Laufzeit pur berechnet, nicht persistiert.

| Feld | Typ | Notiz |
|---|---|---|
| id | String cuid | PK |
| schoolId | String | Schule |
| matchedCount | Int | Anzahl MATCHED |
| pendingCount | Int | Anzahl PENDING |
| unmatchedCount | Int | Anzahl UNMATCHED (Alert) |
| discrepancyCount | Int | Anzahl DISCREPANCY |
| bankTxCount | Int | Anzahl gelesener Bank-Transaktionen |
| runAt | DateTime | Default now() |

Relationen: `school` (schoolId → School, Cascade).
Index: `@@index([schoolId, runAt])`.

## Bestehende Modelle (erweitert)

### Payout (E2)
Neue Rück-Relation `bankTransactions BankTransaction[]` (ein Payout kann mit einer
Bank-Tx gematcht sein) und `ledger`-Bezug über die weiche `refId`-Referenz im
LedgerEntry (keine harte FK, damit der Geld-Pfad nicht an das Ledger gekoppelt wird).
Keine Änderung an Feldern oder Status-Semantik (PENDING → SENT → CONFIRMED bleibt).

### School (E8)
Neue Rück-Relationen `ledgerEntries LedgerEntry[]`, `bankTransactions BankTransaction[]`,
`reconciliations Reconciliation[]`. Keine Änderung an Onboarding-/Payout-Feldern.

### User
Neue Rück-Relation `ledgerEntries LedgerEntry[] @relation("LedgerActor")` (als Akteur
einer Bewegung). Keine neuen Money-Felder.

## Ledger-Hash-Chain (Integrität)

`entryHash = sha256(canonical(sequence, entryType, amountCents, currency, schoolId,
actorUserId, reason, refType, refId, createdAt-bucket, prevHash))`.

- `canonical(...)` ist eine **stabil sortierte** Schlüssel-Wert-Serialisierung (pur,
  `ledger-hash.ts`), damit der Hash deterministisch und reproduzierbar ist.
- `prevHash` des ersten Eintrags einer Schule ist `""` (Genesis); jeder weitere trägt
  den `entryHash` seines Vorgängers.
- `verifyChain(entries)` (pur) prüft Sequence-Monotonie, prevHash-Verkettung und
  Hash-Neuberechnung → manipulationssicher gegen nachträgliche Änderung (die per
  Append-only-API ohnehin nicht möglich ist). E14 (CSRD) baut darauf auf.
