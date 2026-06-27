# API Contracts — 003 Payments All-or-Nothing

Alle Antworten folgen dem `{ success, data?, error? }`-Envelope (Constitution V).

## POST /campaigns/:campaignId/donations/card

Karten-PLEDGE (All-or-Nothing). Bucht NICHT sofort ab.

Request (CardDonationDto):
```json
{ "amountCents": 5000, "tipCents": 0, "message": "Go!", "anonymous": false, "donorName": "Jane" }
```

Response 201 — unter dem Ziel (Pledge erfasst):
```json
{
  "donation": { "id": "…", "amountCents": 5000, "tipCents": 0, "status": "PLEDGED" },
  "campaign": { "id": "…", "status": "LIVE", "goalCents": 10000, "raisedCents": 5000,
                "tipsCents": 0, "currency": "EUR", "percent": 50 }
}
```

Response 201 — Ziel erreicht (Pledges captured + Beleg):
```json
{
  "donation": { "id": "…", "status": "CAPTURED", "amountCents": 4000, "tipCents": 1000 },
  "campaign": { "status": "FUNDED", "raisedCents": 10000, "percent": 100, "...": "..." },
  "capture": { "capturedIds": ["…"], "failedIds": [], "capturedCents": 4000 },
  "receipt": { "receiptNo": "BURSA-2026-…", "amountCents": 4000, "...": "..." }
}
```

Fehler:
- `402 PAYMENT_FAILED` — Karte nicht autorisierbar (Mock: Betrag endet auf `.13`).
- `404 NOT_FOUND` — Kampagne nicht sichtbar/verifiziert.
- `409 CAMPAIGN_FULLY_FUNDED` — Kampagne nimmt keine Spenden mehr an.

## POST /campaigns/:campaignId/donations/sepa  (Rolle SPONSOR)

Corporate-Sofortspende (SEPA), unverändert: `status: "SUCCEEDED"` + `receipt`.

## GET /campaigns/:campaignId/donations

Öffentliche Unterstützerliste; enthält jetzt `SUCCEEDED`, `PLEDGED` und
`CAPTURED` Spenden.

## PaymentProvider-Interface (intern, tauschbar)

```ts
savePledge(input): Promise<{ status: 'AUTHORIZED'|'FAILED'; pledgeRef; failureReason? }>
captureOnGoalReached(input): Promise<{ status: 'SUCCEEDED'|'FAILED'; reference; failureReason? }>
payoutToSchool(input): Promise<{ status: 'SENT'|'FAILED'; reference; failureReason? }>
```

Auswahl per `PAYMENT_PROVIDER=stripe|mock` (+ `STRIPE_SECRET_KEY`); Default Mock.
