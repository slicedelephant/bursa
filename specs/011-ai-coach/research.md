# Research & Clarify — Feature 011 AI Fundraising Coach (E10)

Autonom getroffene Entscheidungen (kein User-Input). Jede offene Frage wurde im
Sinne der Constitution (Trust-by-Design, Provider-Abstraktion, Immutabilität,
kleine Module, Boundary-Validation, {success,data}-Envelope, Key serverseitig) und
der EPICS-PROGRESS-Direktive (pragmatisch, keine neue externe Infra, robuster
getesteter Kern, E3 wiederverwenden) entschieden.

## E1 — LLM-Anbindung: direkter Call vs. austauschbare Provider-Abstraktion

**Entscheidung:** Das LLM sitzt hinter einem `TextGenerationProvider`-Interface mit
einem `TEXT_GENERATION_PROVIDER`-Symbol als DI-Token. Default ist der
`MockTextGenerationProvider` (deterministisch, keine Netzaufrufe); ein echtes
`ClaudeTextGenerationProvider`-Skeleton ist per `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`
einschaltbar. Die Wahl trifft eine pure Factory (`createTextGenerationProvider`), genau
wie `createPaymentProvider`.

**Begründung:** Constitution III verlangt jede externe Anbindung hinter einer Naht mit
deterministischem Mock. So läuft der Prototyp ohne Key, die Tests berühren nie das Netz,
und ein realer Provider ist ohne Domänen-Änderung austauschbar. Die Naht ist bewusst
identisch zum Payment-Muster, damit das Repo ein einziges, konsistentes Provider-Pattern
hat.

## E2 — Echter Provider: `@anthropic-ai/sdk` vs. `fetch`

**Entscheidung:** Der `ClaudeTextGenerationProvider` ruft die Anthropic Messages API per
`fetch` (lazy, im Methoden-Aufruf), nicht über das SDK. Modell-Default `claude-sonnet-4-6`
fürs Drafting (Opus `claude-opus-4-8` als dokumentierte Alternative), Key aus
`ANTHROPIC_API_KEY`.

**Begründung:** Das bestehende Seed-Skript ruft OpenAI bereits per `fetch` ohne SDK; das
hält den Build dependency-frei und vermeidet eine optionale Abhängigkeit, die im
Test-/Default-Lauf nie gebraucht wird. Das Skeleton kompiliert, ist aber im autonomen Lauf
inert. (Der Stripe-Provider lädt sein SDK lazy via `require` aus demselben Grund — hier
ist `fetch` noch schlanker, weil global verfügbar.)

## E3 — Brand-Stimme: Fine-Tuning/RAG vs. Prompt-Engineering + Post-Processor

**Entscheidung:** Die Bursa-Stimme entsteht zweistufig: (a) ein sorgfältiger System-Prompt
plus Few-Shot-Hinweise im puren `prompt-builder.ts`, (b) ein deterministischer
`tone-postprocessor.ts`, der AI-Floskeln/Intensifier entfernt, Em-Dashes zu Bindestrichen
normalisiert und bei `locale=de` echte Umlaute über eine konservative Wortliste erzwingt.

**Begründung:** Fine-Tuning/RAG ist eigenes Epic-Volumen, im autonomen Lauf nicht testbar
und für einen Prototyp überdimensioniert. Der Post-Processor ist pur, voll testbar und
garantiert die harten Brand-Regeln unabhängig vom Provider — also auch dann, wenn der echte
Claude-Provider doch mal eine Floskel durchrutschen lässt. Die Umlaut-Erzwingung ist
bewusst konservativ (Wortliste statt blindes ae→ä), um legitime Wörter ("Aerosol",
"Poesie") nicht zu zerstören.

## E4 — Varianten/A-B: kreatives Sampling vs. deterministisches Ranking

**Entscheidung:** Der Provider liefert mehrere Roh-Varianten; eine pure
`variant-ranking.ts` säubert (trim, leere/duplizierte raus), ranked deterministisch
(Länge im kanal-/kind-spezifischen Zielfenster zuerst, dann stabile Sortierung) und
markiert genau eine Empfehlung. 1-Klick-Refresh ruft schlicht erneut.

**Begründung:** Ein Prototyp braucht reproduzierbare Tests; echtes Temperatur-Sampling
wäre nicht-deterministisch. Das Ranking ist eine erklärbare Regel und im Mock voll
deterministisch; mit echtem Provider variieren nur die Roh-Texte, nicht die Auswahl-Logik.

## E5 — Token-Budget: echtes Billing vs. persistierter Pro-Nutzer-Zähler

**Entscheidung:** Eine `AiTokenBudget`-Zeile pro Nutzer (`limitTokens`, `usedTokens`,
`generations`). Vor jeder Generierung prüft der Service das Restbudget über die pure
`token-budget.ts` (Schätzung je Generierung anhand Eingabe-/Ausgabelänge); ist es
erschöpft, `429 BUDGET_EXCEEDED` **ohne** Provider-Aufruf. Nach Erfolg wird `usedTokens`
fortgeschrieben.

**Begründung:** Constitution verlangt Boundary-/Invarianten-Checks vor Seiteneffekten. Ein
exakter Tokenizer/Cost-Center ist Out-of-Scope; ein deterministischer Zähler erfüllt das
Ziel "kein Nutzer verbrennt unbegrenzt Tokens" und ist voll testbar. Die Budget-Zeile ist
ein Aggregat am `User`, kein Money-Pfad.

## E6 — Einbettung: neuer Coach-Screen vs. assistive Box im E3-Wizard

**Entscheidung:** Der Coach lebt als assistive Panel-Komponente **im** bestehenden
E3-Campaign-Wizard (Story-Schritt) plus eine Titel-Übernahme. Es gibt keine neue Route und
keine zweite Story-Quelle; Coach-Ausgabe wird nur auf bewusste Nutzer-Aktion in die
vorhandenen Signale (`title` / `background` / `challenge` / `vision`) übernommen.

**Begründung:** Der E3-Befund zeigt die saubere Naht: der Wizard round-trippt die
Story-Teile bereits zum Backend, `composeStory` absorbiert beliebigen Inhalt. Eine
assistive Einbettung hält den manuellen Flow intakt (Constitution: AI ist optional) und
vermeidet doppelte Zustandshaltung.

## Constitution-Check

- **Trust & Verification by Design:** Der Coach berührt weder Verifizierung noch den
  Geld-Pfad; er erzeugt nur Textvorschläge. Geld weiterhin nur an die Schule.
- **Provider-Abstraktion:** LLM hinter `TextGenerationProvider`; Mock-Default, Claude
  per Env-Flag austauschbar — 1:1 das `PaymentProvider`-Muster.
- **Immutabilität & kleine Module:** alle Kerne sind pure Funktionen, die neue Werte
  zurückgeben; jede Datei hat eine Verantwortung (<400 Zeilen).
- **Boundary-Validation & Envelope:** class-validator-DTOs an jedem Endpunkt; globale
  `{success,data}`-Envelope; Budget-Verletzung als `DomainException(429)`.
- **Privacy & Security:** `ANTHROPIC_API_KEY` nur serverseitig in Env, nie im Client, nie
  im Repo; im Default-Lauf wird gar kein Key gebraucht.
