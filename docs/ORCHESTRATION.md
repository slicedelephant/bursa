# FundingApp - Orchestrierungs- und Entscheidungs-Log

Dieses Dokument ist das Nacht-Protokoll des orchestrierenden Agents. Es haelt fest,
was entschieden wurde, warum, und wo wir im Prozess stehen. Lies das hier zuerst,
wenn du morgens reinschaust.

**Projekt:** FundingApp - "GoFundMe fuer angenommene MBA-Studierende aus
einkommensschwachen Laendern; Auszahlung direkt an die Business School."
**Repo:** github.com/slicedelephant/fundingApp
**Code:** `~/dev/se_projects/fundingApp/` (kein Code in OneDrive, per Dev-Politik)
**Start:** 2026-06-26, abends. Modus: autonom (Dennis schlaeft).

## Deine 4 Weichenstellungen (beantwortet)

| Frage | Entscheidung |
|---|---|
| Umfang | **Maximum** - so viel wie ueber Nacht baubar |
| Stack | **Angular (Frontend) + NestJS (Backend) + PostgreSQL** |
| Payments | **Komplett gemockt** (saubere Abstraktion, spaeter echt tauschbar) |
| Morgen frueh | **Lokal lauffaehig + Walkthrough-Doku** |

## Vom Agent autonom getroffene Entscheidungen (Defaults)

- **ORM:** Prisma (schnelle, typsichere Migrationen + Seeding; saubere NestJS-Integration).
- **Auth:** JWT (passport-jwt) + bcrypt, leichtgewichtig - kein Clerk.
- **Frontend-Version:** Angular 20 (Angular CLI 22 verlangt Node >=24.15.0, lokal 24.11.1;
  v20 laeuft sauber auf Node 24.11.1 und ist nah an deinem bestehenden Angular-19-Setup).
- **Styling:** Tailwind CSS (Brand-Farben #4d977c gruen, #fe5c4a orange, #6ca5c3 blau).
- **DB lokal:** Docker-Compose Postgres 16 auf Host-Port **5433** (kollidiert nicht mit
  anderen lokalen Postgres). Start: `npm run db:up`.
- **Monorepo:** keine npm-Workspaces (vermeidet Angular/Nest-Peer-Konflikte). Stattdessen
  `apps/api` + `apps/web` als eigenstaendige Projekte, Root-`package.json` mit
  Komfort-Scripts (`dev`, `db:up`, `seed`, ...) via `concurrently`.
- **Sprachen:** App-UI Englisch (internationale Zielgruppe). spec-kit-Artefakte
  (constitution/spec/plan/tasks) Englisch (Framework-Konvention, Code ist Englisch).
  Human-facing Docs (Marktrecherche, Walkthrough, dieses Log) Deutsch.
- **Seed-Bilder:** OpenAI DALL-E (Key aus `06_IT/.env`), synthetische Profilbilder fuer
  ~10-12 Dummy-Studierende. Werden als statische Assets committet.

## Prozess (spec-kit, vom Orchestrator gefahren)

`constitution -> specify -> clarify -> plan -> tasks -> analyze -> implement`
Offene Fragen werden NICHT an Dennis gestellt, sondern recherchiert und selbst
entschieden (Dennis schlaeft). Schwere Arbeit wird an Sub-Agents/Workflows delegiert.

## Fortschritt

- [x] Recon: Node 24, Docker+Compose, uvx, gh (slicedelephant) - alles da. OPENAI_KEY in 06_IT/.env vorhanden.
- [x] Repo geklont (war leer), spec-kit initialisiert (`.specify/`, Claude-Integration).
- [x] Constitution v1.0.0 geschrieben.
- [x] Monorepo-Geruest: NestJS 11 (`apps/api`), Angular 20 (`apps/web`), docker-compose, Root-Scripts, .gitignore, .env.example.
- [x] **Marktrecherche** (Multi-Agent-Workflow, 27 Agenten, ~1,8 Mio Tokens) -> Report `260626_FundingApp_Marktrecherche.md` im OneDrive-Ordner.
- [x] spec.md (specify) - `specs/001-bursa-funding-platform/spec.md`.
- [x] plan.md + research/data-model/contracts/quickstart.
- [x] tasks.md.
- [x] Backend (NestJS): Fundament + 3 Module selbst, 4 Module via paralleler Sub-Agents. Build + Boot + Tests gruen.
- [x] Frontend (Angular): Core/Design-System selbst, 6 Feature-Pages via paralleler Sub-Agents. Build gruen.
- [x] Seed: 11 synthetische Studierende, 4 Schools, Demo-Accounts, KI-Portraits (gpt-image-1).
- [x] Lokaler End-to-End-Run im Browser verifiziert (Spende, Admin-Verify, Payout, Sponsor, Student).
- [x] 1 Integrationsbug gefixt (`/students/me`-Shape) + Build-Output-Fix (prisma aus nest build).
- [x] Walkthrough + README + 4 Screenshots.
- [x] Commit (sauber, mehrere logische Commits) + Push nach GitHub.

## Status: FERTIG. Lauffaehiger Prototyp.

Verifizierte Flows (live im Browser): Gallery + Kartenspende (Fortschritt aktualisiert),
Admin-Verifizierung (PENDING -> LIVE, erscheint in Gallery), Direktauszahlung an die Schule
(FUNDED -> DISBURSED, Payout an INSEAD), Sponsor-Impact + Receipt, Studierenden-Dashboard.

## So startest du die App

```bash
cd ~/dev/se_projects/fundingApp
npm run db:up          # Postgres via Docker (Port 5433)
npm run install:all    # falls noch nicht installiert
npm run prisma:migrate # Schema
npm run seed           # 11 Studierende + KI-Profilbilder (setzt Demo-Daten zurueck)
npm run dev            # API (3000) + Web (4200)  ->  http://localhost:4200
```

Demo-Login (Passwort `bursa1234`): admin@bursa.test, sponsor@acme.test, donor@bursa.test, amara@bursa.test.
Details: `docs/WALKTHROUGH.md`.
