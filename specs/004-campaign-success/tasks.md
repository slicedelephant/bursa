# Tasks — 004 Kampagnen-Erfolgs-Engine (TDD-geordnet)

Tests zuerst (RED), dann Implementierung (GREEN), dann Refactor.

## Phase 1 — Video-Embed-Parser (Backend, pur)
- [ ] T01 Test `campaigns/video-url.util.spec.ts` (YouTube-Varianten, Vimeo,
      ungültig, Embed-URL, isEmbeddableVideoUrl)
- [ ] T02 Impl `campaigns/video-url.util.ts`

## Phase 2 — Boundary-Validator (Backend)
- [ ] T03 Test `campaigns/dto/is-video-url.validator.spec.ts` (validate true/false,
      Decorator-Metadata)
- [ ] T04 Impl `campaigns/dto/is-video-url.validator.ts`
- [ ] T05 DTO erweitern: `create-campaign.dto.ts` (+ videoUrl + 3 Story-Bausteine)

## Phase 3 — Prisma
- [ ] T06 Schema: Campaign += videoUrl/storyBackground/storyChallenge/storyVision
- [ ] T07 Migration `campaign_story_video` (committet)

## Phase 4 — Service + Mapper (Backend)
- [ ] T08 Test `campaigns/campaigns.service.spec.ts` (create persistiert neue
      Felder, update überschreibt selektiv)
- [ ] T09 Impl `createForUser` + `updateForUser` (neue Felder)
- [ ] T10 Test `campaign.mapper.spec.ts` erweitern (videoUrl im Detail)
- [ ] T11 Impl `toDetail` += videoUrl

## Phase 5 — Frontend pure Helfer
- [ ] T12 Test `features/campaign/video-embed.spec.ts`
- [ ] T13 Impl `features/campaign/video-embed.ts`
- [ ] T14 Test `features/campaign/share-links.spec.ts`
- [ ] T15 Impl `features/campaign/share-links.ts`
- [ ] T16 Test `features/student/story-framework.spec.ts`
- [ ] T17 Impl `features/student/story-framework.ts`

## Phase 6 — Frontend Komponenten
- [ ] T18 Test `features/campaign/campaign-video.component.spec.ts`
- [ ] T19 Impl `features/campaign/campaign-video.component.ts`
- [ ] T20 Test `features/campaign/share-toolkit.component.spec.ts`
- [ ] T21 Impl `features/campaign/share-toolkit.component.ts`
- [ ] T22 Test `features/student/campaign-wizard.component.spec.ts` (Schritte,
      Validierung, Autosave-Restore, Submit-Call)
- [ ] T23 Impl `features/student/campaign-wizard.component.ts` (+ wizard-storage)

## Phase 7 — Verdrahtung
- [ ] T24 `core/models.ts` + `core/api.service.ts` (videoUrl + Story-Felder)
- [ ] T25 `campaign.page.ts`: Video + Share-Toolkit einbauen
- [ ] T26 `campaign-status.component.ts`: Share-Toolkit + "erste 3 Spender"
- [ ] T27 `student.page.ts`: Wizard statt altem campaign-form

## Phase 8 — Seed + Gates + Verify
- [ ] T28 Seed: Beispiel-Videos + Story-Bausteine für einige Studierende
- [ ] T29 Per-Path-80%-Gates (api package.json jest + web jest.config.js)
- [ ] T30 Verify: api test, web test:cov (Gates halten), beide builds grün, Seed läuft

## Bewusste Lücken (nicht blockierend)
- [ ] Echter Video-Upload/-Hosting
- [ ] Server-seitiger teil-validierter Draft (statt localStorage)
- [ ] Automatische Mehrsprachigkeit der Story
