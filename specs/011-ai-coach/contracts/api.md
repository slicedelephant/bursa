# API Contracts — Feature 011 AI Fundraising Coach (E10)

Alle Responses folgen dem Envelope `{ success, data?, error? }`.
Fehler: `{ success: false, error: { code, message, details? } }`.
Alle Coach-Endpunkte sind JWT-geschützt und auf Rolle `STUDENT` beschränkt
(`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.STUDENT)`); der Nutzer wird über
`@CurrentUser('id')` aufgelöst. Der `ANTHROPIC_API_KEY` bleibt serverseitig.

## AI Coach (JWT, Rolle `STUDENT`)

### GET /api/ai/budget
Liefert das Token-Budget des aktuellen Nutzers (legt es bei Bedarf mit Default-Limit an).
```
200 { success:true, data:{ limitTokens, usedTokens, remainingTokens, generations,
       exhausted } }
```

### POST /api/ai/title
Body: `{ country, school, program, motivation, locale? }`
(`locale` ∈ `de|en`, Default `en`; `motivation` min. 3 Zeichen, max. 1000).
Erzeugt mehrere Titel-Varianten aus dem Kurzinput. Belastet das Budget; bei erschöpftem
Budget `429 BUDGET_EXCEEDED` **ohne** Provider-Aufruf.
```
200 { success:true, data:{
  kind:"TITLE", locale, provider,
  variants:[{ text, recommended, length }],
  recommendedIndex,
  budget:{ remainingTokens, exhausted } } }
```

### POST /api/ai/story
Body: `{ school, goalEur, motivation, background?, locale? }`.
Erzeugt einen 2-3-Absatz-Story-Draft, abgebildet auf die E3-Teile.
```
200 { success:true, data:{
  kind:"STORY", locale, provider,
  variants:[{ text, recommended, length,
              parts:{ background, challenge, vision } }],
  recommendedIndex,
  budget:{ remainingTokens, exhausted } } }
```

### POST /api/ai/share
Body: `{ channel, title, story, locale? }` (`channel` ∈ `whatsapp|email|linkedin`).
Erzeugt kanal-optimierte Share-Text-Varianten.
```
200 { success:true, data:{
  kind:"SHARE", channel, locale, provider,
  variants:[{ text, recommended, length }],
  recommendedIndex,
  budget:{ remainingTokens, exhausted } } }
```

Refresh / A-B: derselbe Endpunkt wird erneut aufgerufen ("1-Klick-Refresh"); jeder Aufruf
liefert einen frischen Varianten-Satz und belastet das Budget erneut.

## Validierung & Fehlercodes (neu)

- **Boundary-Validation:** class-validator-DTOs (`@IsString`, `@IsIn`, `@MinLength`,
  `@MaxLength`, `@IsInt`, `@Min`). Unbekannte Felder werden durch die globale
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`) verworfen → `400 VALIDATION_ERROR`.
- `400 VALIDATION_ERROR` — ungültiger Body (fehlende/zu kurze Felder, unbekannter Kanal/
  Locale).
- `401 UNAUTHORIZED` — kein/ungültiges JWT.
- `403 FORBIDDEN` — Rolle ist nicht `STUDENT`.
- `429 BUDGET_EXCEEDED` — Token-Budget des Nutzers erschöpft; es erfolgt **kein**
  Provider-Aufruf.

## Cross-cutting (bestehend, wiederverwendet)

- **Envelope:** `ApiResponseInterceptor` (`{success,data}`) + `AllExceptionsFilter`
  (`{success,error:{code,message}}`) — keine manuelle Envelope in Controller/Service.
- **Domain-Fehler:** als `DomainException(code, message, status)` geworfen.
- **E3-Übernahme:** Die Coach-Ausgabe wird clientseitig in den bestehenden
  `POST /api/campaigns`-Payload übernommen (`title`, `storyBackground/-Challenge/-Vision`);
  kein neuer Persistenz-Endpunkt.
