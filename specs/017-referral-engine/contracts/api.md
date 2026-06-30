# API Contracts — Feature 017 Referral- & Advocate-Engine (E15)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Alle Routen: `JwtAuthGuard` + `RolesGuard`. Rollen pro Fläche unten. `userId` kommt aus
dem JWT (`@CurrentUser('id')`).

## Donor — Referral-Seite

`@Controller('donors/me/referral')`, `@Roles(DONOR)`.

### GET /donors/me/referral
Holt oder erzeugt (lazily) den Referral-Link des Spenders und liefert das
Tracking-Dashboard.

```json
{
  "success": true,
  "data": {
    "link": { "code": "a1b2…", "shareUrl": "https://bursa.app/r/a1b2…" },
    "stats": {
      "invited": 14, "donated": 5, "active": 2,
      "conversionPct": 35.7, "viralCoefficient": 0.36,
      "label": "14 invited, 5 donated, 2 active"
    },
    "reward": {
      "tier": "SILVER", "nextTier": "GOLD", "toNext": 5, "perk": "RECAP",
      "bothWin": true
    },
    "optInLeaderboard": false,
    "templates": {
      "email": { "subject": "Help a student reach their tuition goal", "body": "…" },
      "whatsapp": { "body": "…" },
      "linkedin": { "body": "…" }
    }
  }
}
```
- **Code-Anzeige:** Der eigene Referral-Link ist das Teil-Sharing-Asset des Spenders
  (kein Berechtigungs-Token wie ein Admin-Grant). Damit der Donor seinen Link bei jedem
  Account-Besuch wiederfindet, persistiert `ReferralLink` neben dem `codeHash` einen
  anzeigbaren `code`. Advocate-Invite-Links dagegen sind streng hash-only (Raw 1× bei
  Anlage). Begründung steht in research.md, Entscheidung 3.

### POST /donors/me/referral/leaderboard-opt-in
Body `{ "optIn": true }`. Schaltet die Teilnahme am anonymen Referral-Leaderboard.
```json
{ "success": true, "data": { "optInLeaderboard": true } }
```

## Referral-Leaderboard (anonym, opt-in)

`@Controller('referral')`, `@Roles(DONOR)`.

### GET /referral/leaderboard
Nur opt-in-Teilnehmer; Labels anonymisiert ("Supporter #1").
```json
{
  "success": true,
  "data": {
    "entries": [
      { "id": "u_…", "label": "Supporter #1", "score": 9, "rank": 1 },
      { "id": "u_…", "label": "Supporter #2", "score": 4, "rank": 2 }
    ]
  }
}
```

## Advocate-Seite (Studierende)

`@Controller('campaigns/:id')`. Management-Routen `@Roles(STUDENT)` (Owner-skopiert auf
die eigene Kampagne); das Leaderboard ist auth-gated, aber rollenoffen lesbar.

### POST /campaigns/:id/advocates
Lädt einen Advocate ein (≤ 15 pro Kampagne). Body:
```json
{ "name": "Jordan Alumni", "email": "jordan@example.com" }
```
`email` optional. Antwort enthält den Raw-Share-Link **einmalig** + Templates:
```json
{
  "success": true,
  "data": {
    "id": "adv_…",
    "name": "Jordan Alumni",
    "shareUrl": "https://bursa.app/r/9f8e…",
    "templates": {
      "email": { "subject": "…", "body": "…" },
      "whatsapp": { "body": "…" },
      "linkedin": { "body": "…" }
    }
  }
}
```
- 16. Invite → `400 { "success": false, "error": "Advocate limit reached" }`.
- Fremde Kampagne → `403`.

### GET /campaigns/:id/advocates
Fundraiser-Dashboard (Owner-skopiert).
```json
{
  "success": true,
  "data": {
    "campaignId": "c_…",
    "advocateCount": 3, "remaining": 12,
    "advocates": [
      { "id": "adv_…", "name": "Jordan", "referralCount": 6,
        "reward": { "tier": "SILVER", "perk": "RECAP" }, "rank": 1 }
    ],
    "leaderboard": [ { "id": "adv_…", "label": "Jordan", "score": 6, "rank": 1 } ]
  }
}
```

### GET /campaigns/:id/advocate-leaderboard
Öffentlich lesbares (auth-gated) Advocate-Leaderboard für die Kampagnen-Seite.
```json
{
  "success": true,
  "data": { "entries": [ { "id": "adv_…", "label": "Jordan", "score": 6, "rank": 1 } ] }
}
```

## Attribution (intern, kein eigener Endpoint)

Beim Donate-Flow wird ein optionaler `referralCode` (Referral oder Advocate) im
Donation-Body/Query mitgegeben. Nach erfolgreicher, gezählter Spende ruft der
Donations-Pfad `ReferralService.attributeDonation(...)`. Die Attribution ist
**fire-and-forget bezüglich des Geld-Pfads**: ein Fehler bricht nie die Spende ab.
Money-frei; Geld fließt unverändert an die Schule.

## Fehlerformat (JSON-Routen)
```json
{ "success": false, "error": "Advocate limit reached" }
```
- Falsche Rolle → `403` (RolesGuard). Fehlender/ungültiger Token → `401`.
- Limit / fremde Kampagne / ungültiger Code → `400`/`403` mit `DomainException`-Code.
