# Feature 011 — AI Fundraising Coach (E10)

## WHY

Eine Bursa-Kampagne lebt oder stirbt mit ihrer Story. Genau hier verlieren die
Studierenden am meisten Zeit und Conversion: viele schreiben in einer Fremdsprache,
ringen mit dem leeren Textfeld und formulieren technisch statt emotional. GoFundMe
zeigt mit seinem AI Fundraising Coach, dass KI-generierte Titel, Beschreibungen und
Share-Texte die Conversion messbar heben — und dass jede Minute, die ein Fundraiser
nicht am Text klebt, eine Minute fürs Netzwerken ist (Spenden kommen aus dem eigenen
Netzwerk, nicht aus dem leeren Textfeld).

Dieses Epic gibt den Studierenden einen **AI Fundraising Coach**, der genau in den
in E3 gebauten geführten Story-Rahmen (`story-framework.ts` + Campaign-Wizard)
hineingreift — er **ersetzt den manuellen Flow nicht, er assistiert ihm**. Der Coach
schlägt Titel vor, entwirft eine Story aus Schule + Ziel + Motivation, optimiert
Share-Texte pro Kanal (WhatsApp / E-Mail / LinkedIn) und liefert auf 1-Klick mehrere
Varianten zur A/B-Auswahl. Der Tonfall ist authentisch (keine AI-Floskeln) und bei
deutscher Locale mit echten Umlauten — angelehnt an die Bursa-Brand. Genau wie der
`PaymentProvider` (Constitution III) sitzt das LLM hinter einer **austauschbaren
Provider-Abstraktion**: der Prototyp liefert einen **deterministischen Mock** (keine
Netzwerkaufrufe, läuft ohne Key), ein echter Claude-Provider ist per Env-Flag
einschaltbar. Pro Nutzer begrenzt ein **Token-Budget** die Generierungen, damit
niemand unbegrenzt Tokens verbrennt.

## WHAT (Scope dieses Epics — gelieferter Kern)

- **AI Titel-Generator:** aus einem Kurzinput (Land, Schule, Programm, Kernmotivation)
  erzeugt der Coach kurze, emotionale, wirkungsvolle Titel-Vorschläge. Die
  Prompt-Konstruktion ist pur (`prompt-builder.ts`); der Provider liefert die Varianten.
- **AI Story-Draft:** aus Schule + Ziel + Motivation entsteht ein 2-3-Absatz-Entwurf,
  der 1:1 auf die E3-Story-Teile (`background` / `challenge` / `vision`) abbildet — der
  Wizard absorbiert die Coach-Ausgabe über das bestehende `composeStory`, ohne eine
  zweite Story-Quelle zu schaffen.
- **AI Social-Share-Texte:** pro Kanal optimiert — WhatsApp (kurz, persönlich, Emoji-arm),
  E-Mail (Betreff + Body, mehr Kontext), LinkedIn (professionell, Hook + Call-to-Action).
  Der Kanal-spezifische Zuschnitt liegt in `prompt-builder.ts`.
- **1-Klick-Refresh (A/B-Varianten):** jede Generierung liefert mehrere Varianten; der
  Studierende wählt die beste. Die Auswahl-/Ranking-Hilfe (`variant-ranking.ts`) ordnet
  Varianten deterministisch (Länge im Zielfenster, keine leeren/duplizierten Varianten)
  und markiert eine empfohlene.
- **Tone-Control & Anti-Slop:** ein purer Post-Processor (`tone-postprocessor.ts`)
  entfernt AI-Floskeln ("Spannend, wie…", "In der heutigen schnelllebigen Welt…",
  Intensifier wie "enorm/fundamental/massiv"), normalisiert Em-Dashes zu Bindestrichen
  und erzwingt bei deutscher Locale **echte Umlaute** (ae→ä, oe→ö, ue→ü, ss→ß über eine
  konservative Wortliste, nie blind).
- **Token-Budget pro Nutzer:** eine deterministische, pure Verbrauchsrechnung
  (`token-budget.ts`) plus eine persistierte `AiTokenBudget`-Zeile pro Nutzer
  (`limitTokens`, `usedTokens`). Vor jeder Generierung prüft der Service das Restbudget;
  ist es erschöpft, wird `429 BUDGET_EXCEEDED` geworfen, ohne den Provider aufzurufen.
- **Provider-Abstraktion:** `TextGenerationProvider`-Interface, `MockTextGenerationProvider`
  (Default, deterministisch), `ClaudeTextGenerationProvider` (echtes Skeleton, gated über
  `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`), gewählt durch eine pure Factory
  (`text-generation-provider.factory.ts`) — exakt im Muster von `payment-provider.factory.ts`.

## User Stories

- **US1 (MBA-Studierender):** Als Studierender aus Pakistan will ich in 2 Minuten einen
  emotionalen Titel plus drei Social-Varianten generieren, damit mein Diaspora-Netzwerk
  sofort versteht, worum es geht — ohne selbst schreiben zu müssen. (P1)
- **US2 (Studierende mit schwachem Deutsch):** Als Fundraiserin mit Sprachhürde will ich
  AI-Texte, die authentisch klingen und die Bursa-Brand reflektieren (echte Umlaute, keine
  AI-Floskeln), damit Spender Vertrauen fassen. (P1)
- **US3 (vielbeschäftigte Studentin):** Als vielbeschäftigte MBA-Studentin will ich
  A/B-Varianten meiner Story generieren und die beste übernehmen, damit ich mehr Zeit fürs
  Netzwerken habe statt am Textfeld zu kleben. (P1)
- **US4 (Studierender im Wizard):** Als Studierender will ich den Coach optional in jedem
  Story-Schritt aufrufen und seinen Vorschlag in das jeweilige Textfeld übernehmen, ohne
  dass mein manuell getippter Text verloren geht. (P1)
- **US5 (Plattform-Betreiber):** Als Betreiber will ich, dass kein Nutzer unbegrenzt
  Generierungen auslöst, damit die LLM-Kosten kalkulierbar bleiben. (P2)

## Key Entities

- **AiTokenBudget** (neu) — ein Token-Budget pro Nutzer (`@unique` userId):
  `limitTokens` (Standard-Kontingent), `usedTokens` (kumulierter Verbrauch),
  `generations` (Anzahl Aufrufe), `updatedAt`. Weiche fachliche Referenz auf `User`.
- **AiGeneration** (neu, optional gespeichert) — ein protokollierter Coach-Aufruf
  (`kind` TITLE/STORY/SHARE, `channel?`, `locale`, `provider`, `tokensCharged`,
  `variantCount`), weiche Referenz auf `User`. Für Nachvollziehbarkeit/Analytics, nicht
  für den Geld-Pfad.
- **User** (bestehend) — wiederverwendet als Anker des Budgets (`aiTokenBudget`-Relation,
  `aiGenerations`-Relation). Keine neuen Money-/Verification-Felder.
- **Campaign / StudentProfile** (bestehend, E3) — unverändert: die Coach-Ausgabe fließt
  über den bestehenden Wizard-Payload (`storyBackground/-Challenge/-Vision` + `title`) in
  die Kampagne, es entsteht keine zweite Story-Tabelle.

## Success Criteria

- Aus einem Kurzinput liefert der Coach mehrere Titel-Varianten; bei `AI_PROVIDER=mock`
  (Default) deterministisch und ohne jeden Netzwerkaufruf.
- Aus Schule + Ziel + Motivation entsteht ein 2-3-Absatz-Story-Draft, der sich 1:1 in die
  drei E3-Story-Teile übernehmen lässt; der manuelle E3-Flow (Tippen, `composeStory`,
  `isStoryReady`) bleibt voll funktionsfähig.
- Share-Texte werden pro Kanal (WhatsApp / E-Mail / LinkedIn) unterschiedlich
  zugeschnitten; die Kanal-Logik ist pur und testbar.
- 1-Klick-Refresh erzeugt erneut Varianten; die Ranking-Hilfe ist deterministisch
  (gleiche Eingabe → gleiche Reihenfolge), verwirft leere/duplizierte Varianten und
  markiert genau eine Empfehlung.
- Der Tone-Post-Processor entfernt definierte AI-Floskeln/Intensifier, ersetzt Em-Dashes
  durch Bindestriche und erzwingt bei `locale=de` echte Umlaute — pur und voll testbar,
  ohne legitime Wörter zu zerstören.
- Das Token-Budget ist deterministisch: jede Generierung erhöht `usedTokens`; ist das
  Budget erschöpft, antwortet der Endpunkt mit `429 BUDGET_EXCEEDED` und ruft den Provider
  **nicht** auf. Der seedseitige Demo-Student hat ein sichtbares Restbudget.
- Die LLM-Anbindung sitzt hinter `TextGenerationProvider`; Mock ist Default, Claude per
  `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY` einschaltbar und kompiliert, ohne im Test/
  Default-Lauf je das Netz zu berühren.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds grün,
  Prisma-Migration committet, Seed läuft (inkl. AI-Budget-Demodaten).
- `{success,data}`-Envelope, Boundary-Validation und Immutabilität bleiben gewahrt; der
  geprüfte Geld-Pfad und die E3-Story-Struktur werden nicht angefasst. Geld weiterhin nur
  an die Schule.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** Live-LLM-Aufruf im Default-Lauf und in den Tests. Der Prototyp liefert den
  **deterministischen Mock** (`MockTextGenerationProvider`); der echte
  `ClaudeTextGenerationProvider` ist ein einschaltbares Skeleton (Env-gated), wird in den
  Tests **nicht** ausgeführt, muss aber kompilieren — exakt die Linie von
  `MockPaymentProvider` / `StripePaymentProvider`.
- **Kein** Fine-Tuning, **kein** eigenes Modell, **kein** RAG/Embeddings-Store. Die
  Brand-Stimme entsteht über Prompt-Engineering (System-Prompt + Few-Shot im Prompt-Builder)
  plus den deterministischen Post-Processor, nicht über ein trainiertes Modell.
- **Kein** echtes Token-/Billing-System. Das Token-Budget ist ein einfacher, persistierter
  **Zähler pro Nutzer** (geschätzte Tokens je Generierung), keine Anbindung an die echte
  Anthropic-Abrechnung und kein Cost-Center.
- **Keine** Mehrsprachen-Maschine über DE/EN hinaus. Der Coach honoriert die angeforderte
  Locale (DE mit echten Umlauten, EN), aber eine vollständige i18n-Pipeline ist ein eigener
  Folge-Schritt.
- **Kein** Streaming-/Realtime-Coach und keine clientseitigen LLM-Calls. Der Key bleibt
  serverseitig (Constitution VI); der Client spricht ausschließlich den Bursa-Endpunkt an.
- **Keine** automatische Veröffentlichung der Coach-Ausgabe. Der Studierende übernimmt
  Varianten bewusst per Klick in den bestehenden Wizard; nichts wird ohne sein Zutun
  gespeichert oder live geschaltet.
