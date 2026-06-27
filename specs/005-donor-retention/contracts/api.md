# API Contracts — 005 Donor Retention Loop

Alle Responses im `{ success, data }`-Envelope. Geld in Cents.

## Spende (erweitert)

### POST /api/campaigns/:campaignId/donations/card  (optionale Auth)
Body (zusätzlich zu E2/E3):
```jsonc
{
  "amountCents": 5000,
  "tipCents": 0,
  "message": "Go for it",
  "anonymous": false,
  "donorName": "Jane",
  "tributeType": "HONOR",      // optional: HONOR | MEMORY
  "tributeName": "Prof. Mensah" // optional, Pflicht wenn tributeType gesetzt
}
```
- Mit gültigem Bearer-Token wird die Spende dem Spender zugeordnet
  (`donorUserId`), löst Auto-Abo + Dank + Meilenstein-Notifications aus.
- Ohne Token: anonyme Spende wie bisher (keine Notifications).
- Validierung: `tributeType` und `tributeName` nur gemeinsam (400 sonst).

## Donor-Account  (JWT, Rolle DONOR)

### GET /api/donors/me/history
```jsonc
{ "success": true, "data": {
  "summary": {
    "totalDonatedCents": 32000, "donationCount": 4, "campaignsSupported": 3,
    "repeatDonor": true, "activeRecurringCount": 1
  },
  "donations": [
    { "id": "d1", "campaignId": "c1", "campaignTitle": "...", "schoolName": "...",
      "amountCents": 5000, "status": "CAPTURED", "method": "CARD",
      "tribute": "In honour of Prof. Mensah", "anonymous": false,
      "recurring": false, "createdAt": "..." }
  ]
}}
```

### GET /api/donors/me/donations/:id/receipt
→ `Receipt` (wie E2/E5: receiptNo, date, donor, amountCents, currency, campaign, school, issuer). 403 wenn nicht eigene Spende.

## Recurring (simuliert)  (JWT, Rolle DONOR)

### POST /api/donors/me/recurring
Body: `{ "campaignId": "c1", "amountCents": 2500 }` → `RecurringPledge`.
Validierung: Kampagne muss LIVE+verifiziert sein; Betrag >= 100.

### GET /api/donors/me/recurring
→ `RecurringPledge[]` (des Spenders, mit Kampagnen-Titel).

### POST /api/donors/me/recurring/:id/pause | /resume | /cancel
→ aktualisierter `RecurringPledge`. 403 wenn fremd.

### POST /api/donors/me/recurring/run
Simuliert die fälligen Monatsabbuchungen des Spenders über die Payment-Engine.
→ `{ "charged": [...], "failed": [...], "cancelled": [...] }`.

## Notifications / Impact-Feed  (JWT, jede Rolle)

### GET /api/notifications
→ `{ "items": Notification[], "unread": 2 }` (channel IN_APP, neueste zuerst).

### POST /api/notifications/:id/read
→ aktualisierte `Notification` (`readAt` gesetzt). 403 wenn fremd.

### GET /api/donors/me/subscriptions  (DONOR)
→ `{ campaignId, campaignTitle, createdAt }[]`.

## Impact-Update (bestehend, jetzt mit Fan-out)

### POST /api/campaigns/:id/updates  (JWT, Owner/Admin)
Unverändert im Body; Seiteneffekt neu: alle Abonnenten erhalten je eine IN_APP-
und eine EMAIL-Notification (IMPACT_UPDATE).
