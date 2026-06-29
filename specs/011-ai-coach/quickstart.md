# Quickstart — Feature 011 AI Fundraising Coach (E10)

## Lokal starten

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                                   # Postgres (5433)
cd apps/api && npx prisma migrate dev           # wendet ai_coach an
cd ../.. && npm run seed                         # inkl. AI-Budget-Demodaten
npm run dev                                      # api + web
```

Der Coach läuft per Default mit `AI_PROVIDER=mock` — vollständig deterministisch und
**ohne** `ANTHROPIC_API_KEY`. Der Seed legt für `amara@bursa.test` ein sichtbares
Token-Budget an.

## Demo-Accounts (Passwort: `bursa1234`)

- `amara@bursa.test` — Studierende mit Live-Kampagne + AI-Token-Budget (→ `/student`,
  Coach im Campaign-Wizard, Story-Schritt)
- `admin@bursa.test` · `donor@bursa.test` · `sponsor@acme.test` · `schooladmin@bursa.test`

## Tests

```bash
npm --prefix apps/api run test:cov    # Backend Jest + Per-Path-Coverage-Gates
npm --prefix apps/web run test:cov    # Frontend Jest + Per-Path-Coverage-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

Kein Test berührt das Netz: der Mock ist deterministisch, das Claude-Skeleton wird nie
ausgeführt.

## Coach-Flow manuell prüfen (STUDENT)

1. Als `amara@bursa.test` einloggen → `/student`.
2. Im Campaign-Wizard zum **Story-Schritt** wechseln. Das **AI Coach**-Panel zeigt das
   Restbudget und Buttons für Titel / Story / Share.
3. **Titel generieren** → mehrere Varianten erscheinen, eine ist empfohlen; **Refresh**
   liefert einen neuen Satz; **Übernehmen** schreibt die gewählte Variante ins Titel-Feld.
4. **Story generieren** → der Draft wird in die drei Story-Felder
   (`background`/`challenge`/`vision`) übernommen; der manuell getippte Text wird nur auf
   Klick ersetzt.
5. **Share-Text** je Kanal (WhatsApp / E-Mail / LinkedIn) generieren und kopieren.
6. Der manuelle E3-Flow bleibt voll nutzbar — der Coach ist optional.

## Endpunkte manuell prüfen (curl, JWT als STUDENT)

```bash
# Login (amara) → TOKEN
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"amara@bursa.test","password":"bursa1234"}' | sed 's/.*"accessToken":"//;s/".*//')

# Budget
curl -s localhost:3000/api/ai/budget -H "authorization: Bearer $TOKEN"
# → { success:true, data:{ limitTokens, usedTokens, remainingTokens, generations, exhausted } }

# Titel (deutsch, echte Umlaute, keine AI-Floskeln)
curl -s -X POST localhost:3000/api/ai/title -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"country":"Nigeria","school":"ESMT Berlin","program":"Full-Time MBA","motivation":"Fintech-Erfahrung zurück nach Westafrika bringen","locale":"de"}'
# → { success:true, data:{ kind:"TITLE", variants:[...], recommendedIndex, budget:{...} } }

# Share-Text für WhatsApp
curl -s -X POST localhost:3000/api/ai/share -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"channel":"whatsapp","title":"From Lagos fintech to a Berlin MBA","story":"...","locale":"en"}'
```

## Echten Claude-Provider testweise einschalten (optional, nicht im Default)

```bash
export AI_PROVIDER=claude
export ANTHROPIC_API_KEY=sk-ant-...
# (ohne gültigen Key fällt der Factory-Pfad sicher auf den Mock zurück)
```

## Release-Checkliste (Folge-Arbeit, ehrlich abgegrenzt)

- [ ] **Live-LLM produktiv:** echten `ClaudeTextGenerationProvider` mit Retries/Timeout/
      Rate-Limit härten (heute: Skeleton, im Default inert).
- [ ] **Exaktes Token-Accounting:** echten Tokenizer + Cost-Center statt geschätztem
      Pro-Nutzer-Zähler (heute: deterministische Schätzung).
- [ ] **Brand-Stimme vertiefen:** Few-Shot-Bibliothek / optional Fine-Tuning statt nur
      Prompt + Post-Processor (heute: Prompt-Engineering + deterministischer Post-Processor).
- [ ] **Mehrsprachigkeit:** vollständige i18n-Pipeline über DE/EN hinaus.
- [ ] **Streaming-UX:** Token-Streaming im Wizard statt Block-Antwort.
