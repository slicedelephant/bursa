# API Contracts — 004 Kampagnen-Erfolgs-Engine

Alle Antworten folgen dem `{ success, data?, error? }`-Envelope (Constitution V).
Dieses Epic erweitert bestehende Endpunkte; es kommen keine neuen Routen hinzu.

## POST /campaigns  (Rolle STUDENT) — erweitert

Erstellt die Kampagne (DRAFT). Neue optionale Felder:

```json
{
  "schoolId": "…",
  "programName": "Full-Time MBA 2026",
  "title": "Help me finish my MBA",
  "story": "Background…\n\nThe gap…\n\nMy vision…",
  "goalCents": 4200000,
  "deadline": "2026-09-01",
  "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
  "storyBackground": "Where I am coming from…",
  "storyChallenge": "The funding gap…",
  "storyVision": "Where this takes me…"
}
```

- `videoUrl` optional; muss zu YouTube/Vimeo-Embed parsen, sonst
  `400 VALIDATION_ERROR`.
- `story` weiterhin Pflicht, `MinLength(20)` (vom Wizard aus den Bausteinen
  komponiert).
- `storyBackground|Challenge|Vision` optional, je `MaxLength(2000)`.

## PATCH /campaigns/:id  (Rolle STUDENT, nur DRAFT) — erweitert

Akzeptiert dieselben neuen optionalen Felder (PartialType). Nur gesetzte Felder
werden überschrieben.

## GET /campaigns/:id — erweitert

`data` enthält zusätzlich `videoUrl`:

```json
{
  "id": "…",
  "title": "…",
  "story": "…",
  "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
  "trust": { "…": "…" },
  "…": "…"
}
```

`videoUrl` ist `null`, wenn kein Video gesetzt ist.

## GET /students/me — unverändert (liefert neue Spalten automatisch)

Die rohe Kampagne (für den Owner) enthält nun `videoUrl`, `storyBackground`,
`storyChallenge`, `storyVision`, sodass der Wizard das Gerüst rehydrieren und der
Studierende sein Video sehen kann.

## Validator-Interface (intern)

```ts
parseVideoUrl(url: string): { provider: 'youtube'|'vimeo'; id: string; embedUrl: string } | null
isEmbeddableVideoUrl(url: string): boolean   // -> @IsEmbeddableVideoUrl() Decorator
```

## Share-Deeplinks (Frontend, pur — kein Endpoint)

```ts
buildShareLinks({ url, title, studentName, lang }) -> {
  whatsapp:  'https://wa.me/?text=…',
  telegram:  'https://t.me/share/url?url=…&text=…',
  facebook:  'https://www.facebook.com/sharer/sharer.php?u=…',
}
```
