# API Contracts — Feature 018 Multi-Channel Impact-Feed (E17)

JSON-Routen nutzen den `{ success, data?, error? }`-Envelope (Response-Interceptor).
Alle Routen: `JwtAuthGuard` + `RolesGuard`. `userId` kommt aus dem JWT
(`@CurrentUser('id')`). **Der E4-E-Mail-Danke-Pfad (`/notifications`) bleibt unverändert und
ist NICHT Teil dieses Contracts.**

## Feed (Spender)

`@Controller('feed')`, `@Roles(DONOR)`.

### GET /feed
Personalisierter Impact-Feed: chronologische Story-Cards aus den unterstützten Kampagnen
(E4-`CampaignUpdate` + abgeleitete Milestones + APPROVED Student-Voices) plus die
Update-Read-Streak.
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "key": "voice:msg_123",
        "kind": "STUDENT_VOICE",
        "campaignId": "c_amara",
        "title": "A thank-you from Amara",
        "body": "Thank you for believing in me — I just started my second semester.",
        "ctaUrl": "/campaigns/c_amara",
        "photoUrl": "https://…/amara.jpg",
        "videoUrl": "https://…/amara-thanks.mp4",
        "createdAt": "2026-06-28T10:00:00.000Z",
        "read": false
      },
      {
        "key": "update:upd_77",
        "kind": "IMPACT_UPDATE",
        "campaignId": "c_amara",
        "title": "Passed first-semester exams",
        "body": "Amara cleared every module with distinction.",
        "ctaUrl": "/campaigns/c_amara",
        "photoUrl": "https://…/amara.jpg",
        "createdAt": "2026-06-20T09:00:00.000Z",
        "read": true
      }
    ],
    "unreadCount": 1,
    "readStreak": {
      "currentMonths": 3, "longestMonths": 3,
      "currentMonthCovered": true, "lastActiveMonth": "2026-06"
    }
  }
}
```

### POST /feed/:itemKey/read
Markiert ein Feed-Item (per stabilem `key`) als gelesen. Idempotent
(`FeedRead @@unique([userId, feedItemKey])`). Speist die Read-Streak.
```json
{ "success": true, "data": { "read": true } }
```

### GET /feed/channel-prefs
Liefert die Kanal-Opt-ins des Spenders (IN_APP immer aktiv, nicht abwählbar).
```json
{
  "success": true,
  "data": {
    "prefs": [
      { "channel": "IN_APP", "optIn": true },
      { "channel": "WHATSAPP", "optIn": true, "handle": "+49…" },
      { "channel": "TELEGRAM", "optIn": false },
      { "channel": "EMAIL", "optIn": true },
      { "channel": "PUSH", "optIn": false },
      { "channel": "MESSENGER", "optIn": false }
    ]
  }
}
```

### PUT /feed/channel-prefs
Setzt das Opt-in für **einen** Kanal. Body:
```json
{ "channel": "WHATSAPP", "optIn": true, "handle": "+4915112345678" }
```
- `IN_APP` kann nicht abgewählt werden → `400 { "success": false, "error": "IN_APP is always on" }`.
```json
{ "success": true, "data": { "channel": "WHATSAPP", "optIn": true } }
```

### GET /feed/inactivity
Inaktivitäts-Status + sanfte Reminder-Entscheidung (Geld-frei; CTA verlinkt nur den
bestehenden Donate-Flow).
```json
{
  "success": true,
  "data": {
    "inactive": true,
    "daysSince": 95,
    "shouldRemind": true,
    "reminder": {
      "title": "It's been a while — your students miss you",
      "body": "Amara just passed her exams. Pick up your giving streak with one tap.",
      "ctaUrl": "/campaigns/c_amara?ref=reminder"
    }
  }
}
```

## Student-Voice (Studierende)

`@Controller('campaigns/:id')`, `@Roles(STUDENT)` (Owner-skopiert auf die eigene Kampagne).

### POST /campaigns/:id/voice
Sendet eine kurze Dank-Nachricht. Body:
```json
{
  "text": "Thank you so much for supporting my MBA journey.",
  "videoUrl": "https://example.com/thanks.mp4",
  "voiceUrl": null
}
```
- `text` Pflicht (≤ 600 Zeichen). `videoUrl`/`voiceUrl` optional, müssen http(s) sein.
- Moderation läuft synchron über die E9-Keyword-Filter + Slur-Liste.

**APPROVE** (gespeichert + an Opt-in-Spender gefächert über den gemockten Messaging-Provider):
```json
{
  "success": true,
  "data": { "id": "msg_123", "status": "APPROVED", "reasons": [], "delivered": 2 }
}
```
**REJECT** (nichts gesendet, Gründe zurück):
```json
{
  "success": true,
  "data": { "id": "msg_124", "status": "REJECTED",
            "reasons": ["slur:<term>", "url_invalid:voiceUrl"], "delivered": 0 }
}
```
- Fremde Kampagne → `403`. Fehlende/ungültige Felder → `400` (DTO-Validierung).

## Messaging-Provider (intern, kein Endpoint)

Das Fächern an WhatsApp/Telegram/Messenger/Push läuft ausschließlich über
`MessagingProvider.send(...)`. Default `MockMessagingProvider` (kein Netz, zeichnet Sends auf).
Provider-Wahl rein per `createMessagingProvider(env)` (`MESSAGING_PROVIDER=mock|whatsapp|telegram`,
Default `mock`). Der Versand ist **fire-and-forget bezüglich des Geld-Pfads** und money-frei;
ein Fehler bricht nie eine Spende ab (E17 berührt keine Spende).

## Fehlerformat (JSON-Routen)
```json
{ "success": false, "error": "IN_APP is always on" }
```
- Falsche Rolle → `403` (RolesGuard). Fehlender/ungültiger Token → `401`.
- Fremde Kampagne / ungültige Pref / ungültiges Voice-Feld → `400`/`403` mit `DomainException`-Code.
