# Implementation Plan — Feature 011 AI Fundraising Coach (E10)

## Architektur-Überblick

Ein neues, hochkohäsives Feature-Modul `ai/` kapselt die Text-Generierung des Coaches:
Titel, Story-Draft, Share-Texte, Refresh-Varianten und das Token-Budget. ALLE
testbare Logik liegt in puren Util-Dateien (je `.spec.ts` + Per-Path-Gate) — der
Prompt-Bau, der Tone-/Anti-Slop-/Umlaut-Post-Processor, das Varianten-Ranking und die
Token-Verbrauchsrechnung. Der eigentliche LLM-Aufruf sitzt hinter einer austauschbaren
`TextGenerationProvider`-Abstraktion (exakt das `PaymentProvider`-Muster aus Constitution
III) und ist damit dünn und mockbar. Der Service ist dünn: Budget prüfen, Prompt bauen
(pur), Provider rufen, Ausgabe nachbereiten (pur), Budget fortschreiben, optional
protokollieren. Keine neue externe Infra; alles in der bestehenden Postgres-DB. E3 wird
nicht angefasst — der Coach assistiert dem bestehenden Wizard, er ersetzt ihn nicht.

Wiederverwendung statt Neubau:
- **E3 `story-framework.ts` + Campaign-Wizard** → der Coach füllt die bestehenden
  Story-Teile (`background` / `challenge` / `vision`) und das Titel-Feld; `composeStory`/
  `isStoryReady` und der manuelle Tipp-Flow bleiben unverändert.
- **`PaymentProvider`-Muster** (`payment-provider.factory.ts` + `payments.module.ts`) →
  1:1 kopiert als `TextGenerationProvider` / `createTextGenerationProvider` / `AiModule`.
- **Globale `{success,data}`-Envelope + `ValidationPipe` + `DomainException`** → keine
  manuelle Envelope, Boundary-Validation per class-validator-DTO, Budget-Fehler als
  `DomainException('BUDGET_EXCEEDED', …, 429)`.

```
apps/api/src/ai/
  prompt-builder.ts                 (pure)  System-/User-Prompts für Titel/Story/Share je Kanal+Locale
  prompt-builder.spec.ts
  tone-postprocessor.ts             (pure)  Anti-Slop + Em-Dash→Bindestrich + echte Umlaute (de)
  tone-postprocessor.spec.ts
  variant-ranking.ts                (pure)  Varianten säubern/deduplizieren/ranken + Empfehlung
  variant-ranking.spec.ts
  token-budget.ts                   (pure)  Restbudget/Verbrauch/Schätzung, deterministisch
  token-budget.spec.ts
  text-generation-provider.interface.ts     Interface + Input/Output-Typen + TEXT_GENERATION_PROVIDER-Symbol
  mock-text-generation.provider.ts          (Default) deterministischer Mock, keine Netzaufrufe
  mock-text-generation.provider.spec.ts
  claude-text-generation.provider.ts         echtes Skeleton (fetch → Anthropic Messages API, lazy)
  text-generation-provider.factory.ts        (pure) mock|claude wählen + Fallback auf Mock
  text-generation-provider.factory.spec.ts
  ai-coach.service.ts               Budget-Guard → Prompt → Provider → Post-Process → Budget-Update
  ai-coach.service.spec.ts
  ai.controller.ts                  /ai/* (STUDENT) generate title/story/share + budget
  ai.module.ts                      @Global Provider-Wiring (useFactory/ConfigService) + Controller/Service
  dto/ generate-title · generate-story · generate-share

apps/api/src/app.module.ts                 + AiModule
apps/api/prisma/schema.prisma              + AiGenerationKind (enum); AiTokenBudget, AiGeneration;
                                             User.aiTokenBudget / User.aiGenerations Relationen
apps/api/prisma/seed.ts                    + Demo-Token-Budget für amara@bursa.test (sichtbares Restbudget)

apps/web/src/app/features/student/
  ai-coach.helpers.ts               (pure) Varianten-Anzeige, Restbudget-Format, Kanal-Labels, Kind-Labels
  ai-coach.helpers.spec.ts
  ai-coach-panel.component.ts        assistive Coach-Box im Wizard (generieren/refresh/Variante übernehmen)
  campaign-wizard.component.ts       minimal-invasiv: Coach-Panel in Step 2 (Story) + Titel-Übernahme
apps/web/src/app/core/{models.ts, api.service.ts}  + E10-Typen/Methoden (unwrap(http.post(Envelope)))
```

## TDD-Reihenfolge (Tests zuerst, RED → GREEN → REFACTOR)

Pure Kerne zuerst (leicht 80%, höchster Wert), dann Provider + Factory, dann der dünne
Service (mit Prisma-/Provider-Mock), zuletzt Wiring + Frontend.

1. **token-budget** (pure) — Restbudget, Verbrauchs-Schätzung, Erschöpfungs-Check.
2. **tone-postprocessor** (pure) — Anti-Slop, Em-Dash-Normalisierung, echte Umlaute (de).
3. **prompt-builder** (pure) — System-/User-Prompts je Kind (Titel/Story/Share), Kanal-
   und Locale-Verzweigung.
4. **variant-ranking** (pure) — Säubern/Deduplizieren/Ranken + genau eine Empfehlung.
5. **MockTextGenerationProvider** (deterministisch) + **text-generation-provider.factory**
   (mock|claude, Fallback auf Mock) — Muster der payment-factory.
6. **ai-coach.service** (mit Prisma-Mock + Provider-Mock): Budget-Guard → Prompt →
   Provider → Post-Process → Budget-Update; `BUDGET_EXCEEDED` ohne Provider-Aufruf.
7. **Wiring**: DTOs (class-validator), `ai.controller`, `ai.module`, `app.module`.
8. **Prisma-Migration** `ai_coach` + Seed-Erweiterung (Demo-Budget für amara).
9. **Frontend** pure Helfer (`ai-coach.helpers`) + Coach-Panel-Komponente + api.service/
   models + minimal-invasive Wizard-Einbettung in Step 2.
10. **VERIFY**: api test:cov, web test:cov, beide build, seed; Per-Path-Gates eintragen;
    migrate status/diff.

## Risiko-/Stabilitäts-Leitplanken

- **E3-Flow unangetastet:** Der Coach schreibt ausschließlich in bestehende Wizard-
  Signale (`title` / `background` / `challenge` / `vision`) und nur auf bewusste
  Nutzer-Aktion ("übernehmen"). Manuell getippter Text geht nie verloren; `composeStory`/
  `isStoryReady` und das Step-Gating bleiben unverändert.
- **Default ohne Key lauffähig:** `AI_PROVIDER` ist standardmäßig `mock`; der Coach läuft
  vollständig deterministisch ohne `ANTHROPIC_API_KEY`. Der Claude-Provider wird nur bei
  explizitem Flag + Key gewählt; jeder Konstruktions-/Lauf-Fehler fällt auf den Mock
  zurück, damit der Endpunkt nie hart bricht.
- **Kein Netz in Tests:** Der Mock macht keine Netzaufrufe; das Claude-Skeleton wird in
  den Tests nicht ausgeführt (nur Kompilier-Garantie). `fetch` statt SDK hält den Build
  ohne neue Dependency grün (Linie des OpenAI-Seed-Skripts).
- **Budget fail-loud, ohne Provider-Aufruf:** Ist das Budget erschöpft, wirft der Service
  `429 BUDGET_EXCEEDED`, bevor irgendein Provider angefasst wird — keine stillen Kosten.
- **Key bleibt serverseitig:** Der Client spricht nur den Bursa-Endpunkt an; der
  `ANTHROPIC_API_KEY` verlässt nie den Server (Constitution VI).
- **Reine, deterministische Kerne:** Prompt-Bau, Post-Processor, Ranking und Budget-
  Rechnung sind pure Funktionen ohne I/O — gleiche Eingabe, gleiche Ausgabe, voll testbar.
- **Migration additiv** (zwei neue Tabellen + ein Enum + Relationen) → keine
  Datenmigration nötig; der bestehende `User` bekommt nur Relations-Felder.

## Complexity Tracking

- **Eigenes `ai`-Modul statt Ausbau von `campaigns`:** gerechtfertigt — die Text-
  Generierung ist eine eigene Domäne mit Provider-Abstraktion, vier puren Kernen und
  einem Budget-Aggregat; sie in `campaigns` zu legen würde die Kohäsion senken und den
  geprüften Geld-/Story-Pfad mit LLM-Belangen vermischen.
- **Zwei neue Tabellen (`AiTokenBudget`, `AiGeneration`):** gerechtfertigt — das Budget
  braucht eine persistente Pro-Nutzer-Spur (sonst kein verlässlicher Verbrauch über
  Sessions); `AiGeneration` ist eine schlanke, optionale Audit-/Analytics-Spur. Beide
  hängen weich am bestehenden `User`, keine neue Infra.
- **`fetch` statt `@anthropic-ai/sdk`:** bewusst — das Seed-Skript ruft OpenAI bereits per
  `fetch` ohne SDK; das hält den Build dependency-frei und das Claude-Skeleton trotzdem
  kompilierbar und 1:1 austauschbar.
- **Eigener Anti-Slop-/Umlaut-Post-Processor statt Library:** bewusst — die Bursa-Brand-
  Regeln (echte Umlaute, keine AI-Floskeln, Bindestriche statt Em-Dashes) sind projekt-
  spezifisch, klein und deterministisch; eine Library würde mehr Risiko als Wert bringen.
- **Heuristische Token-Schätzung statt echter Tokenizer:** bewusst — der Prototyp braucht
  einen kalkulierbaren Zähler, kein exaktes Billing; im Out-of-Scope ehrlich abgegrenzt.
