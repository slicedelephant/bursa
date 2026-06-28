# Quickstart — 004 Kampagnen-Erfolgs-Engine

## Voraussetzungen

```bash
cd /Users/dennisvocke/dev/se_projects/fundingApp
npm run db:up                      # Postgres (Docker)
npm --prefix apps/api run seed     # synthetische Demo-Daten (inkl. Beispiel-Videos)
```

## Story-/Video-Onboarding durchspielen

1. Web starten (`npm --prefix apps/web start`), als Studierende einloggen
   (z.B. `amara@bursa.test` / `bursa1234`) bzw. neu registrieren.
2. Profil anlegen -> der Kampagnen-Wizard startet:
   - **Schritt 1 Basics**: Schule, Programm, Titel, Ziel, Deadline.
   - **Schritt 2 Story**: drei geführte Prompts (Background, Challenge, Vision).
     Die Vorschau zeigt die komponierte Story.
   - **Schritt 3 Video/Review**: YouTube/Vimeo-Link einfügen -> Live-Vorschau;
     Review aller Felder -> Kampagne anlegen.
3. **Zwischenspeichern testen**: mitten im Wizard die Seite neu laden — der
   Fortschritt (Schritt + Eingaben) ist via localStorage erhalten.

## Video-Embed prüfen

Akzeptierte URL-Formen (sonst Boundary-Fehler):

```
https://youtu.be/<id>
https://www.youtube.com/watch?v=<id>
https://www.youtube.com/shorts/<id>
https://vimeo.com/<id>
```

Auf der öffentlichen Kampagnenseite erscheint das responsive Embed über der Story.

## Share-Toolkit testen

Auf der Kampagnenseite (Sidebar) bzw. im Studi-Dashboard: WhatsApp / Telegram /
Facebook teilen den Link mit vorformuliertem Text; "Copy link" legt die URL in
die Zwischenablage. Sprache EN/DE umschaltbar. Bei < 3 Spenden zeigt das
Dashboard den "Be the first backers"-Aufruf.

## Tests / Verify

```bash
npm --prefix apps/api test
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

Alle vier müssen grün sein. Neue Pfade sind als 80%-Gate konfiguriert
(`apps/api/package.json` jest.coverageThreshold, `apps/web/jest.config.js`).
