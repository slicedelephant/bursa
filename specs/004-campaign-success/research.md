# Research / Clarify — 004 Kampagnen-Erfolgs-Engine

Offene Fragen wurden autonom entschieden (kein User-Input), informiert durch
`docs/roadmap-epics.md` (E3) und die bestehende Codebasis.

## Entscheidungen

1. **Video: Embed vs. Upload?** -> Embed per URL (YouTube/Vimeo). Vorgabe aus
   EPICS-PROGRESS (Infra-Default: kein File-Hosting). Wir speichern die rohe URL
   in `Campaign.videoUrl`, validieren am Boundary, dass sie zu einem einbettbaren
   YouTube/Vimeo-Link parst, und rendern client-seitig ein `<iframe>` mit der
   nofcookie/Vimeo-Embed-URL. Kein neuer Storage, keine externe Infra.

2. **Welche Video-Provider?** -> YouTube (inkl. `youtu.be`, `/watch?v=`,
   `/embed/`, `/shorts/`) und Vimeo (`vimeo.com/<id>`). Ein einziger pur
   getesteter Parser deckt beide ab und liefert `{ provider, id, embedUrl }`.
   Unbekannte Hosts -> `null` -> Boundary lehnt ab.

3. **Story-Framework: wie strukturieren?** -> Vorher/Nachher in drei Prompts:
   - **Background** ("Where you are coming from") — Ausgangslage/Vorher.
   - **Challenge** ("The funding gap") — was im Weg steht.
   - **Vision** ("Where this takes you") — Wirkung/Nachher.
   Die drei Antworten werden client-seitig per reinem `composeStory()` zu einem
   Fliesstext verbunden (Absätze) und als `story` gesendet (Mindestlänge bleibt
   über das bestehende `CreateCampaignDto`-Constraint erzwungen). Zusätzlich
   werden die drei Bausteine einzeln persistiert, damit das Gerüst beim späteren
   Editieren erhalten bleibt. `story` bleibt einzige Anzeigequelle -> Detail-
   Rendering unverändert.

4. **Mehrstufiges Onboarding mit Zwischenspeichern — Server-Draft oder Client?**
   -> Client-seitig. Ein Studierender hat genau EINE Kampagne; der bestehende
   Create-Contract (`POST /campaigns`) verlangt die Pflichtfelder. Statt den
   Backend-Contract zu lockern (Risiko, Migrationsketten-Stabilität), hält der
   Wizard den Zustand in Signals und spiegelt ihn per Autosave in `localStorage`
   (Key pro User). Reload -> Fortschritt bleibt. Am Ende EIN `createCampaign`-
   Call mit allen Feldern. "Zwischenspeichern" ist damit real und demoable, ohne
   den geprüften Payment-/Verifizierungsfluss zu berühren. Der bestehende
   DRAFT -> PATCH -> submit-Pfad bleibt für spätere Edits erhalten.

5. **Share-Deeplinks — welche Form?** -> Reine URL-Schemata, kein SDK:
   - WhatsApp: `https://wa.me/?text=<text+url>`
   - Telegram: `https://t.me/share/url?url=<url>&text=<text>`
   - Facebook: `https://www.facebook.com/sharer/sharer.php?u=<url>`
   - Copy-Link: `navigator.clipboard` mit Fallback.
   Vorformulierte Nachrichten in EN + DE (Diaspora-Zielgruppe). Alles in einem
   puren, getesteten `share-links.ts` (kein DOM), die Komponente ist nur Hülle.

6. **"Erste 3 Spender"-Flow — wo?** -> Im Studi-Dashboard (campaign-status), wenn
   die Kampagne sichtbar (LIVE/FUNDED/DISBURSED) ist und `donorCount < 3`. Ein
   Hinweis + das Share-Toolkit mit angepasstem Text ("Be the first to back…").
   Kein eigener Server-State nötig.

7. **Coverage-Strategie (Per-Path-Gates).** -> Die genuin neue Logik liegt in
   kleinen, puren Modulen, die auf 80% gegated werden:
   - Backend: `campaigns/video-url.util.ts`, `campaigns/dto/is-video-url.validator.ts`.
   - Frontend: `features/campaign/video-embed.ts`, `features/campaign/share-links.ts`,
     `features/student/story-framework.ts`, plus die schlanken Präsentations-
     Komponenten `campaign-video.component.ts`, `share-toolkit.component.ts` und
     der `campaign-wizard.component.ts`.
   Die große Bestandsdatei `campaigns.service.ts` wird durch neue Tests
   mitgeübt, aber NICHT als 80%-Whole-File-Gate erzwungen (sie enthält
   ungetesteten Altbestand wie Gallery/Stats) — konsistent mit "80% auf neuem
   Code" aus EPICS-PROGRESS.

## Bewusste Auslassungen (ehrliche Lücken, kein Blocker)

- Kein echtes Video-Hosting/Transcoding — nur Embed.
- Keine automatische Story-Übersetzung; Share-Texte EN+DE, Story einsprachig.
- Wizard speichert client-seitig (localStorage), nicht server-seitig als
  teil-validierter Draft.
- Kein Rich-Text/Markdown in der Story — Plain-Text-Absätze.
