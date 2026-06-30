# API Contracts — Feature 016 Spender-Portfolio & Giving-Streaks (E16)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Die Export-Routen streamen `text/csv` bzw. `application/pdf` direkt via `@Res()`
(bypassen den Interceptor). Alle Routen: `JwtAuthGuard` + `RolesGuard` + `@Roles(DONOR)`,
analog zum E4-`DonorsController`. `userId` kommt aus dem JWT (`@CurrentUser('id')`).

## Donor — Portfolio

### GET /donors/me/portfolio
Liefert die komplette Portfolio-View des eingeloggten Spenders.

```json
// 200 data
{
  "items": [
    {
      "campaignId": "c_amara",
      "studentName": "Amara Okonkwo",
      "photoUrl": "/seed/amara-okonkwo.png",
      "country": "Nigeria",
      "schoolName": "ESMT Berlin",
      "campaignTitle": "Help Amara start her MBA",
      "raisedCents": 1840000,
      "goalCents": 4500000,
      "percent": 41,
      "verified": true,
      "yourContributionCents": 45000,
      "canDonateAgain": true
    }
  ],
  "streak": {
    "currentMonths": 7,
    "longestMonths": 7,
    "currentMonthCovered": true,
    "lastActiveMonth": "2026-06"
  },
  "badge": {
    "tier": "SILVER",
    "streakMonths": 7,
    "nextTier": "GOLD",
    "monthsToNextTier": 5
  },
  "stats": {
    "totalCents": 132000,
    "contributionCount": 9,
    "distinctTargets": 5,
    "impactPerTargetCents": 26400,
    "firstMonth": "2025-12",
    "lastMonth": "2026-06"
  },
  "peer": {
    "yourValue": 5,
    "peerAverage": 2.4,
    "ratio": 2.08,
    "ahead": true
  }
}
```

### GET /donors/me/portfolio/export.csv
`text/csv` Download der Portfolio-Übersicht. **Kein** Envelope (via `@Res()`).
`Content-Disposition: attachment; filename="bursa-portfolio.csv"`.

### GET /donors/me/portfolio/export.pdf
`application/pdf` Download der Portfolio-Übersicht (Header: Streak/Badge/Stats,
danach je Studierender eine Zeile). **Kein** Envelope (via `@Res()`).
`Content-Disposition: attachment; filename="bursa-portfolio.pdf"`.

## Verhalten / Edge-Cases

- Spender ohne gezählte Spenden → `items: []`, Streak `currentMonths: 0`,
  Badge `tier: "NONE"`, Stats alle 0, Peer `yourValue: 0`.
- `FAILED/EXPIRED/PENDING`-Spenden werden ignoriert (kein Item, kein Streak-Monat).
- `canDonateAgain` ist `true`, solange die Kampagne `LIVE` ist.

## Fehlerformat (JSON-Routen)
```json
{ "success": false, "error": "Forbidden resource" }
```

Nicht-DONOR-Token → `403` (RolesGuard). Fehlender/ungültiger Token → `401`.
