# Data Model — 005 Donor Retention Loop

Migration: `donor_retention`. Geld in Integer-Cents (EUR), IDs `cuid()`.

## Neue Enums

- `TributeType { HONOR, MEMORY }`
- `RecurringStatus { ACTIVE, PAUSED, CANCELLED }`
- `NotificationType { THANK_YOU, MILESTONE, IMPACT_UPDATE, GOAL_REACHED, RECURRING_CHARGE }`
- `NotificationChannel { IN_APP, EMAIL }`

## Donation (erweitert)

| Feld | Typ | Notiz |
|---|---|---|
| `donorUserId` | `String?` | Spalte existierte; jetzt durch optionale Auth genutzt (Account-Zuordnung). |
| `recurringPledgeId` | `String?` | gesetzt, wenn die Spende aus einem Recurring-Lauf stammt. |
| `tributeType` | `TributeType?` | Widmung "zu Ehren / im Gedenken". |
| `tributeName` | `String?` | Name der gewürdigten Person. |
| `recurringPledge` | Relation | `RecurringPledge?` |

## RecurringPledge (neu)

| Feld | Typ | Notiz |
|---|---|---|
| `id` | `String @id cuid()` | |
| `donorUserId` | `String` | Besitzer (DONOR). |
| `campaignId` | `String` | Geförderte Kampagne. |
| `amountCents` | `Int` | Monatsbetrag. |
| `currency` | `String @default("EUR")` | |
| `status` | `RecurringStatus @default(ACTIVE)` | ACTIVE/PAUSED/CANCELLED. |
| `chargesCount` | `Int @default(0)` | Anzahl simulierter Abbuchungen. |
| `totalChargedCents` | `Int @default(0)` | Summe der Abbuchungen. |
| `nextRunAt` | `DateTime` | Nächste Fälligkeit (Anlage = jetzt). |
| `lastChargedAt` | `DateTime?` | |
| `createdAt/updatedAt` | `DateTime` | |
| Relationen | `donorUser`, `campaign`, `donations[]` | onDelete Cascade auf User/Campaign. |

Indizes: `[donorUserId]`, `[campaignId]`, `[status, nextRunAt]`.

## UpdateSubscription (neu)

| Feld | Typ | Notiz |
|---|---|---|
| `id` | `String @id cuid()` | |
| `donorUserId` | `String` | |
| `campaignId` | `String` | |
| `createdAt` | `DateTime` | |
| Constraint | `@@unique([donorUserId, campaignId])` | idempotent (upsert). |

## Notification (neu)

| Feld | Typ | Notiz |
|---|---|---|
| `id` | `String @id cuid()` | |
| `userId` | `String` | Empfänger. |
| `type` | `NotificationType` | |
| `channel` | `NotificationChannel @default(IN_APP)` | IN_APP = Feed, EMAIL = geloggt. |
| `title` | `String` | |
| `body` | `String` | |
| `campaignId` | `String?` | Bezugskampagne (onDelete SetNull). |
| `emailLogged` | `Boolean @default(false)` | true für EMAIL-Zeilen. |
| `readAt` | `DateTime?` | null = ungelesen. |
| `createdAt` | `DateTime` | |
| Relationen | `user`, `campaign?` | |

Index: `[userId, createdAt]`.

## Reverse-Relationen

- **User**: `recurringPledges RecurringPledge[] @relation("DonorRecurring")`,
  `subscriptions UpdateSubscription[] @relation("DonorSubscriptions")`,
  `notifications Notification[]`.
- **Campaign**: `recurringPledges RecurringPledge[]`,
  `subscriptions UpdateSubscription[]`, `notifications Notification[]`.

## Invarianten

- Recurring-Charges sind sofort SUCCEEDED-Spenden (kein PLEDGED/Capture) — der
  E2-AoN-Pfad bleibt unberührt.
- Tribute: `tributeType` und `tributeName` nur gemeinsam gesetzt (Boundary).
- E-Mail = persistierte Notification-Zeile, niemals echter Versand.
