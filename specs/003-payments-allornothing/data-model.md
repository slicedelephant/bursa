# Data Model — 003 Payments All-or-Nothing

## Enum-Änderung: DonationStatus

```
PENDING | PLEDGED | CAPTURED | SUCCEEDED | FAILED | EXPIRED
```

- `PLEDGED` — Kartenzusage erfasst (Methode + SCA), NICHT abgebucht. Zählt zum Ziel.
- `CAPTURED` — Pledge nach Zielerreichung off_session abgebucht.
- `EXPIRED` — Pledge erlischt ungebucht (Ziel verfehlt / Deadline). (reserviert)
- `SUCCEEDED` — Sofort-Erfassung (Corporate SEPA / 100%-Fall).
- `FAILED` — Autorisierung/Abbuchung fehlgeschlagen.

## Model Donation — neue Felder

| Feld | Typ | Zweck |
|---|---|---|
| `pledgeRef` | `String?` | Referenz auf gespeicherte Zahlungsmethode / SetupIntent |
| `capturedAt` | `DateTime?` | Zeitpunkt der Abbuchung nach Zielerreichung |

## State Machine (Karte / All-or-Nothing)

```
savePledge OK ──> Donation: PLEDGED  (raisedCents += amount, kein Charge)
                      │
   Ziel erreicht ─────┤  captureOnGoalReached()
                      ▼
                  Donation: CAPTURED  (capturedAt gesetzt)   Campaign: FUNDED
                      │
   Capture fehlgeschlagen ──> bleibt PLEDGED (failedIds gemeldet)

Ziel verfehlt / Deadline ──> Pledges bleiben/erlöschen (EXPIRED) — NIE Charge

Campaign: LIVE ──(Pledges == Ziel)──> FUNDED ──(payout)──> DISBURSED
```

## Invariante (Trust-USP)

Zwischen `PLEDGED` und `CAPTURED` bewegt sich KEIN Geld. Erst FUNDED → DISBURSED
bewegt echtes Geld, direkt Richtung Schule. Prüfbar im `pledge-engine` + Tests.

## Migration

`apps/api/prisma/migrations/<ts>_payments_allornothing/migration.sql`
(committet) — fügt Enum-Werte und die beiden nullbaren Spalten hinzu.
