# API Contracts — Feature 019 Gruppen-Engine (E18)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Alle Routen: `JwtAuthGuard`. Feingranulare Autorisierung läuft über die **Gruppen-Rolle**
(`ADMIN`/`CONTRIBUTOR`/`VIEWER`, im Service geprüft), nicht nur die globale App-Rolle.
`userId` kommt aus dem JWT (`@CurrentUser('id')`). **Der E5-Corporate-Payment-Pfad bleibt
unverändert; der Cohort-Match ruft ihn nur auf.**

## Gruppen (CRUD + Übersicht)

`@Controller('groups')`.

### POST /groups
Legt eine Gruppe an (Modus wählt Cohort vs. Circle). Der Ersteller wird erster `ADMIN`. Body:
```json
{
  "mode": "GIVING_CIRCLE",
  "visibility": "PUBLIC",
  "name": "Lagos Alumni Circle",
  "description": "MBA alumni from Lagos supporting the next cohort.",
  "logoUrl": "https://example.com/lagos.png",
  "sharedGoalCents": 500000,
  "stretchThresholdPct": 80
}
```
```json
{ "success": true, "data": { "id": "grp_1", "mode": "GIVING_CIRCLE", "role": "ADMIN" } }
```
- `mode` Pflicht (`COHORT`|`GIVING_CIRCLE`); `name` Pflicht; `stretchThresholdPct` 1..100.

### GET /groups
Meine Gruppen (Membership) + öffentliche Gruppen (`visibility=PUBLIC`).
```json
{
  "success": true,
  "data": {
    "mine": [{ "id": "grp_1", "mode": "GIVING_CIRCLE", "name": "Lagos Alumni Circle", "role": "ADMIN", "memberCount": 4 }],
    "public": [{ "id": "grp_2", "mode": "COHORT", "name": "INSEAD 2026 Cohort", "memberCount": 3 }]
  }
}
```

### GET /groups/:id
Group-Detail: Shared-Goal, Stretch, Leaderboard, Mitglieder, Sub-Kampagnen (Cohort) /
Beiträge (Circle). Nur Mitglieder (oder bei `PUBLIC` jeder eingeloggte User) → sonst `403`.
```json
{
  "success": true,
  "data": {
    "group": { "id": "grp_2", "mode": "COHORT", "visibility": "PUBLIC", "name": "INSEAD 2026 Cohort", "sharedGoalCents": 3000000, "stretchThresholdPct": 80 },
    "role": "ADMIN",
    "memberCount": 3,
    "sharedGoal": { "raisedCents": 2500000, "goalCents": 3000000, "percent": 83, "remainingCents": 500000 },
    "stretch": { "unlocked": true, "thresholdPct": 80, "thresholdCents": 2400000, "percent": 83, "remainingToStretchCents": 0 },
    "leaderboard": [
      { "id": "u_amara", "label": "Amara Okonkwo", "score": 1200000, "rank": 1 },
      { "id": "u_ben", "label": "Ben Mensah", "score": 800000, "rank": 2 }
    ],
    "members": [{ "userId": "u_amara", "role": "ADMIN" }, { "userId": "u_ben", "role": "CONTRIBUTOR" }],
    "subCampaigns": [{ "campaignId": "c_amara", "title": "Amara's MBA", "raisedCents": 1200000, "goalCents": 1500000 }]
  }
}
```

## Membership + Invites

### POST /groups/:id/invites
Erstellt einen Invite-Link (nur `ADMIN`). Body: `{ "role": "CONTRIBUTOR", "expiresInDays": 14 }`.
Der Roh-Token steht **nur** in der zurückgegebenen URL (einmal gezeigt; hash-only persistiert,
E15/E8-Muster).
```json
{ "success": true, "data": { "link": "https://bursa.app/groups/grp_2/join?token=abc123…", "role": "CONTRIBUTOR", "expiresAt": "2026-07-15T00:00:00.000Z" } }
```

### POST /groups/:id/join
Tritt einer Gruppe per Invite-Token bei. Body: `{ "token": "abc123…" }`.
- Ungültiger/abgelaufener/revoked Token → `400`. Schon Mitglied → `409`.
```json
{ "success": true, "data": { "groupId": "grp_2", "role": "CONTRIBUTOR" } }
```

### POST /groups/:id/leave
Verlässt die Gruppe. Der **letzte ADMIN** kann nicht austreten → `409 { "error": "LAST_ADMIN" }`.
```json
{ "success": true, "data": { "left": true } }
```

### PUT /groups/:id/members/:userId/role
Ändert die Rolle eines Mitglieds (nur `ADMIN`). Body: `{ "role": "ADMIN" }`.
- Den **letzten ADMIN** degradieren → `409 { "error": "LAST_ADMIN" }`.
```json
{ "success": true, "data": { "userId": "u_ben", "role": "ADMIN" } }
```

## Cohort: Sub-Kampagnen + Match

### POST /groups/:id/campaigns
Cohort: verknüpft eine eigene Kampagne als Sub-Kampagne (Owner-skopiert; `CONTRIBUTOR`+).
Body: `{ "campaignId": "c_amara" }`.
- Nicht-Cohort-Gruppe → `400`. Fremde Kampagne → `403`. Schon verknüpft → `409`.
```json
{ "success": true, "data": { "groupId": "grp_2", "campaignId": "c_amara" } }
```

### POST /groups/:id/match
Cohort-Match: ein Corporate-Sponsor matched die ganze Kohorte (nur `ADMIN`, Sponsor-Kontext).
`splitCohortMatch` teilt `totalCents` über die Sub-Kampagnen auf und ruft je Kampagne den
**bestehenden** E5-`CorporateService.sponsor` (kein neuer Payment-Pfad). Body:
```json
{ "totalCents": 600000, "tier": "CUSTOM", "method": "SEPA", "scholarshipName": "Acme Cohort Match" }
```
```json
{
  "success": true,
  "data": {
    "totalCents": 600000,
    "sponsored": [
      { "campaignId": "c_amara", "amountCents": 300000 },
      { "campaignId": "c_ben", "amountCents": 300000 }
    ]
  }
}
```
- Money geht an die Schule (E5). E18 schreibt nie selbst auf `Donation`/`Payout`.

## Circle: Beiträge + Portfolio + Analytics

### POST /groups/:id/contributions
Circle: verknüpft eine eigene bestehende Spende als money-freien Gruppen-Beitrag (für
Aggregat/Leaderboard). Body: `{ "donationId": "d_1" }`.
- Fremde/unbekannte Spende → `403`/`404`. Schon verknüpft → `409`.
```json
{ "success": true, "data": { "groupId": "grp_1", "donationId": "d_1", "valueCents": 5000 } }
```

### GET /groups/:id/analytics
Group-Analytics + Portfolio (E16 `aggregateContributions`). Nur Mitglieder.
```json
{
  "success": true,
  "data": {
    "totalCents": 500000, "contributionCount": 12, "distinctTargets": 4,
    "memberCount": 4, "goalPercent": 100, "activeWeek": "2026-W26"
  }
}
```

## Voting

### POST /groups/:id/votes
Öffnet ein Voting (nur `ADMIN`). Body:
```json
{ "question": "Which student do we back next quarter?", "options": [{ "campaignId": "c_amara", "label": "Amara" }, { "campaignId": "c_ben", "label": "Ben" }] }
```
```json
{ "success": true, "data": { "id": "vote_1", "status": "OPEN" } }
```

### POST /groups/:id/votes/:voteId/ballot
Gibt eine Stimme ab (`CONTRIBUTOR`+; eine Stimme pro Mitglied). Body: `{ "optionId": "opt_1" }`.
- Schon abgestimmt → `409`. Vote geschlossen → `409`.
```json
{ "success": true, "data": { "voteId": "vote_1", "optionId": "opt_1" } }
```

### GET /groups/:id/votes/:voteId
Voting-Stand (Tally on read).
```json
{
  "success": true,
  "data": {
    "id": "vote_1", "question": "Which student do we back next quarter?", "status": "OPEN",
    "options": [{ "id": "opt_1", "label": "Amara", "count": 3 }, { "id": "opt_2", "label": "Ben", "count": 1 }],
    "totalVotes": 4, "winnerId": "opt_1", "decided": true
  }
}
```

### POST /groups/:id/votes/:voteId/close
Schließt ein Voting (nur `ADMIN`).
```json
{ "success": true, "data": { "id": "vote_1", "status": "CLOSED", "winnerId": "opt_1" } }
```

## Moderierter Group-Chat (request/response, kein Socket)

### POST /groups/:id/messages
Postet eine Chat-Nachricht (`CONTRIBUTOR`+). Synchron moderiert über die E9-Keyword-/Slur-Filter.
Body: `{ "text": "Great progress this week, team!" }`.

**APPROVE** (gespeichert + sichtbar):
```json
{ "success": true, "data": { "id": "msg_1", "status": "APPROVED", "reasons": [] } }
```
**REJECT** (gespeichert mit Grund, nicht sichtbar):
```json
{ "success": true, "data": { "id": "msg_2", "status": "REJECTED", "reasons": ["slur:idiot"] } }
```
- `text` Pflicht (≤ 500 Zeichen).

### GET /groups/:id/messages
Chat-Historie (nur `APPROVED`), chronologisch. Nur Mitglieder.
```json
{
  "success": true,
  "data": { "messages": [{ "userId": "u_amara", "text": "Great progress this week, team!", "createdAt": "2026-06-28T10:00:00.000Z" }] }
}
```

## Fehlerformat (JSON-Routen)
```json
{ "success": false, "error": "LAST_ADMIN" }
```
- Fehlender/ungültiger Token → `401`. Kein Mitglied / falsche Gruppen-Rolle → `403`.
- Verbotene Membership-Transition / Doppel-Aktion → `409` mit `DomainException`-Code
  (`LAST_ADMIN`, `ALREADY_MEMBER`, `ALREADY_VOTED`, `VOTE_CLOSED`, `NOT_A_COHORT`).
- Ungültiges Feld → `400` (DTO-Validierung).
