# Tasks — Feature 011 AI Fundraising Coach (E10, TDD-geordnet)

Tests ZUERST (RED), dann Implementierung (GREEN), dann Refactor. Pure Kerne mit
80%-Per-Path-Gate. Backend `npm --prefix apps/api run test:cov`, Frontend
`npm --prefix apps/web run test:cov`.

## Phase A — Pure Backend-Kerne (höchster Wert, leicht 80%)

- [x] T01 `token-budget.spec.ts` → `token-budget.ts`: `estimateTokens`,
      `remaining`, `isExhausted`, `applyUsage` (immutabel), Grenzfälle (0, Überzug).
- [x] T02 `tone-postprocessor.spec.ts` → `tone-postprocessor.ts`: `stripAiSlop`,
      `normalizeDashes`, `enforceGermanUmlauts` (konservative Wortliste),
      `applyTone(text, locale)` — de erzwingt Umlaute, en lässt sie weg.
- [x] T03 `prompt-builder.spec.ts` → `prompt-builder.ts`: `buildTitlePrompt`,
      `buildStoryPrompt`, `buildSharePrompt` (Kanal-/Locale-Verzweigung), System-Prompt
      mit Brand-Regeln; reine Strings, keine I/O.
- [x] T04 `variant-ranking.spec.ts` → `variant-ranking.ts`: `rankVariants`
      (trim, dedupe, leere raus, Ziel-Längenfenster zuerst, genau eine Empfehlung),
      `recommendedIndex`, leer/alle-leer.

## Phase B — Provider + Factory (deterministisch)

- [x] T05 `mock-text-generation.provider.spec.ts` → `mock-text-generation.provider.ts`:
      deterministische Titel/Story/Share-Varianten je Input, keine Netzaufrufe,
      stabile Reihenfolge.
- [x] T06 `text-generation-provider.factory.spec.ts` →
      `text-generation-provider.interface.ts` + `text-generation-provider.factory.ts`:
      `shouldUseClaude`, `createTextGenerationProvider` (mock|claude, Fallback auf Mock
      bei fehlendem Key/Fehler).

## Phase C — Service + Wiring

- [x] T07 `ai-coach.service.spec.ts` → `ai-coach.service.ts` (Prisma-Mock +
      Provider-Mock): `getBudget` (Default-Anlage), `generateTitle/Story/Share`
      (Budget-Guard → Prompt → Provider → Post-Process → Budget-Update + AiGeneration),
      `BUDGET_EXCEEDED` ohne Provider-Aufruf.
- [x] T08 DTOs: `generate-title.dto` · `generate-story.dto` · `generate-share.dto`
      (class-validator: `@IsString`, `@IsIn`, `@MinLength`, `@MaxLength`, `@IsInt`, `@Min`).
- [x] T09 `claude-text-generation.provider.ts` (echtes Skeleton, `fetch` → Anthropic
      Messages API, lazy, gated; kompiliert, nie im Test ausgeführt).
- [x] T10 `ai.controller.ts` (STUDENT), `ai.module.ts` (@Global Provider-Wiring via
      useFactory/ConfigService), in `app.module.ts` einhängen.

## Phase D — Datenbank

- [x] T11 `schema.prisma`: `AiGenerationKind` (enum); `AiTokenBudget`, `AiGeneration`;
      `User.aiTokenBudget`/`User.aiGenerations` Relationen; Migration `ai_coach`.
- [x] T12 `seed.ts`: Demo-Token-Budget für `amara@bursa.test` (sichtbares Restbudget);
      lauffähig + idempotent (Cleanup vor `user.deleteMany`).

## Phase E — Frontend (Per-Path-Gate)

- [x] T13 `ai-coach.helpers.spec.ts` → `features/student/ai-coach.helpers.ts`:
      `channelLabel`, `kindLabel`, `formatRemainingBudget`, `variantPreview`,
      `recommendedVariant` (reine Helfer, kein Angular).
- [x] T14 `ai-coach-panel.component.ts`: assistive Coach-Box (generieren/refresh/
      Variante übernehmen) + minimal-invasive Einbettung in `campaign-wizard.component.ts`
      Step 2 (Story) und Titel-Übernahme.
- [x] T15 Einbindung: `models.ts` (E10-Typen), `api.service.ts` (Coach-Methoden via
      `unwrap(http.post(Envelope))`).

## Phase F — Verify & Gates

- [x] T16 Per-Path-80%-Gates in `apps/api/package.json` (4 Kerne + Mock-Provider +
      Factory + Service) + `apps/web/jest.config.js` (`ai-coach.helpers.ts`).
- [x] T17 `npm --prefix apps/api run test:cov` && `npm --prefix apps/web run test:cov`
      && beide `run build` grün && `npm --prefix apps/api run seed` grün &&
      `prisma migrate status`/`diff` sauber.
- [x] T18 Commit (logische Einheiten), Branch push, `gh pr create` (Base main),
      EPICS-PROGRESS aktualisieren.
