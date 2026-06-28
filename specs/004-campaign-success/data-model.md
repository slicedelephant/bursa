# Data Model — 004 Kampagnen-Erfolgs-Engine

## Model Campaign — neue Felder

| Feld | Typ | Zweck |
|---|---|---|
| `videoUrl` | `String?` | Pitch-Video als Embed-Link (YouTube/Vimeo), kein Upload |
| `storyBackground` | `String?` | Story-Baustein "Vorher / Ausgangslage" |
| `storyChallenge` | `String?` | Story-Baustein "Funding-Gap / Hürde" |
| `storyVision` | `String?` | Story-Baustein "Nachher / Wirkung" |

`story` (bestehend, non-null) bleibt die kanonische Anzeige-Story. Der Wizard
komponiert sie aus den drei Bausteinen und sendet sie beim Create mit; die
Bausteine werden zusätzlich gespeichert, damit das geführte Gerüst beim späteren
Editieren erhalten bleibt. Anzeige (campaign detail) liest weiterhin nur `story`.

## Boundary-Validierung

- `videoUrl`: am DTO durch `@IsEmbeddableVideoUrl()` geprüft — akzeptiert nur
  URLs, die `parseVideoUrl` zu einem YouTube/Vimeo-Embed auflöst. Ungültig ->
  `400 VALIDATION_ERROR` (bestehender Pipe/Filter).
- `story`: weiterhin `@MinLength(20)` -> erzwingt, dass die komponierte Story
  nicht leer/zu kurz ist.
- Bausteine: optionale Strings mit `@MaxLength` (Schutz gegen Übergröße).

## Video-Parsing (pur, geteilt)

```
parseVideoUrl(url) -> { provider, id, embedUrl } | null
  youtube:  youtu.be/<id> | /watch?v=<id> | /embed/<id> | /shorts/<id>
            embedUrl = https://www.youtube-nocookie.com/embed/<id>
  vimeo:    vimeo.com/<id>
            embedUrl = https://player.vimeo.com/video/<id>
  sonst:    null
```

## Migration

`apps/api/prisma/migrations/<ts>_campaign_story_video/migration.sql` (committet)
— vier nullbare `TEXT`-Spalten auf `Campaign`, keine Backfills nötig.

## Invarianten

- Keine Geld-/Status-Logik berührt; eine Kampagne startet weiterhin als `DRAFT`
  und wird erst nach Admin-Verifizierung `LIVE` (Constitution II unverändert).
- `videoUrl` ist rein anzeige-relevant; null = kein Video, keine Pflicht.
