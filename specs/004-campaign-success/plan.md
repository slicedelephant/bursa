# Plan — 004 Kampagnen-Erfolgs-Engine

## Ansatz

Drei voneinander unabhängige Bausteine, jeweils mit puren, testbaren Kernen und
schlanken Angular-/Nest-Hüllen: (1) Video-Embed (Boundary-Validierung + Anzeige),
(2) geführtes Story-Onboarding als mehrstufiger Wizard mit localStorage-Autosave,
(3) Share-Toolkit mit puren Deeplink-Buildern. Prisma um `videoUrl` + drei
Story-Bausteine erweitern. Anzeige-Story (`story`) bleibt unveränderte
Single-Source fürs Rendering.

## Backend (NestJS + Prisma)

1. **Prisma**: `Campaign` += `videoUrl String?`, `storyBackground String?`,
   `storyChallenge String?`, `storyVision String?`. Migration
   `campaign_story_video` (committet).
2. `campaigns/video-url.util.ts` (neu, pur): `parseVideoUrl(url)` ->
   `{ provider:'youtube'|'vimeo', id, embedUrl } | null`; `isEmbeddableVideoUrl`.
3. `campaigns/dto/is-video-url.validator.ts` (neu): class-validator-Constraint
   `IsEmbeddableVideoUrl` + Decorator, delegiert an die Util (Boundary-Validation,
   Constitution V).
4. `campaigns/dto/create-campaign.dto.ts`: optionale Felder `videoUrl`
   (`@IsEmbeddableVideoUrl`), `storyBackground`, `storyChallenge`, `storyVision`
   (`@IsOptional @IsString @MaxLength`). `UpdateCampaignDto` erbt via PartialType.
5. `campaigns/campaigns.service.ts`: `createForUser` + `updateForUser`
   persistieren die neuen Felder (immutabel: nur zusätzliche Keys im data-Objekt).
6. `campaigns/campaign.mapper.ts`: `toDetail` gibt `videoUrl` aus.

## Frontend (Angular 20, Signals)

1. `features/campaign/video-embed.ts` (neu, pur): `toEmbed(url)` ->
   `{ provider, embedUrl } | null` (spiegelt Backend-Parser, frontend-seitig fürs
   iframe-`src`).
2. `features/campaign/campaign-video.component.ts` (neu): responsives 16:9-iframe,
   rendert nur bei gültiger URL.
3. `features/campaign/share-links.ts` (neu, pur): `ShareLang`, `shareMessage`,
   `buildShareLinks(input, lang)` -> Map Channel->URL; `campaignUrl(origin, id)`.
4. `features/campaign/share-toolkit.component.ts` (neu): mobile-first Buttons
   (WhatsApp/Telegram/Facebook/Copy), Sprach-Umschalter EN/DE, optionaler
   "first 3 donors"-Kontext-Text; Copy via `navigator.clipboard` mit Fallback.
5. `features/student/story-framework.ts` (neu, pur): `STORY_PROMPTS` (3 Prompts),
   `composeStory(parts)`, `isStoryReady(parts)` (Mindestlänge der Komposition).
6. `features/student/campaign-wizard.component.ts` (neu): 3 Schritte
   (Basics -> Story -> Video/Review), Fortschrittsbalken, localStorage-Autosave
   (`wizardStorage`-Helper), nur Pflichtfelder pro Schritt; ein `createCampaign`
   am Ende. Ersetzt `campaign-form.component.ts` in `student.page.ts`.
7. `features/campaign/campaign.page.ts`: `<app-campaign-video>` (über der Story)
   + `<app-share-toolkit>` (in der Sticky-Sidebar).
8. `features/student/campaign-status.component.ts`: `<app-share-toolkit>` mit
   "erste 3 Spender"-Kontext bei sichtbarer Kampagne.
9. `core/models.ts` + `core/api.service.ts`: `CampaignDetail.videoUrl`,
   `OwnerCampaign` + Story/Video-Felder, `createCampaign`/`updateCampaign`-Body.

## Tests (TDD, >=80% neuer Code)

- Backend Per-Path-Gates: `video-url.util.ts`, `dto/is-video-url.validator.ts`.
- Frontend Per-Path-Gates: `video-embed.ts`, `share-links.ts`, `story-framework.ts`,
  `campaign-video.component.ts`, `share-toolkit.component.ts`,
  `campaign-wizard.component.ts`.
- Zusätzliche (nicht gegatete) Tests: `campaigns.service.spec.ts` (create/update
  mit neuen Feldern), `campaign.mapper.spec.ts` (videoUrl im Detail).

## Constitution-Check

- **Immutabilität**: pure Builder geben neue Objekte/Strings zurück; Service-
  Updates fügen nur Keys hinzu, mutieren keine Inputs. Getestet.
- **Kleine, fokussierte Module**: jede neue Datei < 250 Zeilen, ein Zweck.
- **Boundary-Validation + `{success,data}`-Envelope**: videoUrl wird per
  class-validator am DTO geprüft; Story-Mindestlänge bleibt über `story`-
  Constraint. Bestehender Interceptor/Filter unverändert.
- **Trust-by-Design**: keine Geld-/Verifizierungslogik berührt; Onboarding
  ändert nichts am Verifizierungs-Gate (Kampagne startet weiter als DRAFT).
- **Provider-Abstraktion**: nicht betroffen.

## Complexity Tracking

Keine Abweichung. Bewusst client-seitiges Zwischenspeichern (localStorage) statt
server-seitigem teil-validiertem Draft, um den geprüften Create/Verify/Payment-
Pfad nicht zu destabilisieren (siehe research.md §4).
