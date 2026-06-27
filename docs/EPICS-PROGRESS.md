# Bursa - Autonomer Epic-Build (Fortschritts-Anker)

Dieses Dokument ist die Quelle der Wahrheit fuer den autonomen Build aller 5 Epics.
Es ueberlebt Kontext-Kompaktierung. Nach einem Reset: hier lesen, dann am offenen Schritt weitermachen.

**Direktive (Dennis, 2026-06-27):** Alle 5 Epics in Reihenfolge E1->E2->E3->E4->E5 mit vollem
spec-kit-Flow, voll autonom orchestriert, OHNE Zwischen-Input. Ziel: alle robust, fehlerfrei,
gemaess Constitution.

## Entscheidungen (am Anfang geklaert - gelten fuer ALLE Epics)

1. **E2 Payments:** Mock (Default, laeuft ohne Keys) **+** echter Stripe-Test-Adapter hinter
   Env-Flag `PAYMENT_PROVIDER=stripe|mock`. Beide implementieren dieselbe PaymentProvider-Abstraktion.
2. **Tests:** Volles TDD, **80%+ Coverage** pro Epic. Thresholds in der Test-Config erzwingen
   (Backend Jest `coverageThreshold`; Frontend mit Coverage messbar machen - jest-preset-angular
   oder Karma headless). Tests zuerst (RED), dann Implementierung (GREEN), dann Refactor.
3. **Git:** Feature-Branch + PR pro Epic, **gestapelt** (E(n) branched von E(n-1)). PR-Base =
   Vorgaenger-Branch -> saubere Per-Epic-Diffs. NICHT selbst mergen; Dennis mergt spaeter in
   Reihenfolge E1..E5. Branch-Naming: `00X-<slug>` (spec-kit-Feature-Nummer).
4. **Infra-Defaults:** Video = Embed per URL (kein File-Hosting). E-Mail/Notifications = In-App +
   gemockt/geloggt (kein SMTP). Recurring = ueber Payment-Engine simuliert. Reporting = In-App +
   CSV/PDF-Export. Keine neue externe Infra.

## Per-Epic-Pipeline (spec-kit + TDD)

1. `git checkout -b 00X-<slug>` (von Vorgaenger-Branch bzw. main fuer E1)
2. spec-kit Feature anlegen (`create-new-feature.sh`) -> `specs/00X-<slug>/`
3. **spec.md** (User Stories, FR, Key Entities, Success Criteria) - selbst, informiert durch
   `docs/roadmap-epics.md` + Recherche-Docs
4. **clarify** - Offene Fragen SELBST recherchieren/entscheiden (kein User-Input), in research.md dokumentieren
5. **plan.md** + research.md + data-model.md + contracts/api.md + quickstart.md
6. **tasks.md** (TDD-geordnet: Tests vor Implementierung)
7. **implement (TDD)** - orchestriert mit Sub-Agents/Workflows; Tests zuerst, dann Code, Coverage >=80%
8. **verify** - Build gruen + alle Tests gruen + Coverage >=80% + Playwright-E2E des Epic-Flows
9. **commit + push branch + PR** (gh pr create, Base = Vorgaenger-Branch)
10. Diesen Tracker + Statustabelle aktualisieren -> naechstes Epic

App bleibt nach JEDEM Epic lokal lauffaehig + deploybar (Migrationen committed, Seed aktualisiert).

## Die 5 Epics (Detail in docs/roadmap-epics.md)

- **E1 - Trust-Layer sichtbar machen** (Verification-Badges + Direktfluss-Beweis) -> Feature 002
- **E2 - Stripe All-or-Nothing Zahl-Engine + Goal-Mechanik** (Mock + Stripe-Adapter, Kampagnen-States) -> 003
- **E3 - Kampagnen-Erfolgs-Engine** (Story/Video-Embed, Onboarding-Split, Share-Toolkit) -> 004
- **E4 - Donor Retention Loop** (Account, Recurring-simuliert, Impact-Updates, Tribute) -> 005
- **E5 - Corporate Channel** (B2B-Payment, ESG-Dashboard, Named Scholarship, Full-Tuition-CTA, CSV/PDF) -> 006

## Phase 2 (Folgeauftrag, nach E5 - Dennis 2026-06-27)

Nach Abschluss von E1-E5: einen weiteren Stakeholder-Research-Workflow starten fuer die **4.
Stakeholder-Gruppe: Entwickler/Betreiber der Plattform**. Daraus **2 Epics** definieren (Kandidaten:
Security-Hardening, Analytics/Observability, Marketing/SEO/Growth, oder aehnlich) -> Features `007`
und `008`. Diese 2 Epics dann ebenfalls VOLL AUTONOM mit demselben spec-kit+TDD-Flow umsetzen
(gleiche Entscheidungen wie oben: 80% Coverage, Branch+PR pro Epic, pragmatische Defaults).
Reihenfolge gesamt: E1->E2->E3->E4->E5->[Research devs/ops]->E6->E7.

## Status

| Epic | Feature | Branch | Spec | Plan | Tasks | Impl | Tests>=80% | E2E | PR | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| E1 | 002 | 002-trust-layer | ✓ | ✓ | ✓ | ✓ | ✓ (neuer Code, Per-Path-Gates) | (Komponententests) | #1 | **FERTIG** - PR https://github.com/slicedelephant/bursa/pull/1 |
| E2 | 003 | 003-payments-allornothing | ✓ | ✓ | ✓ | ✓ | ✓ (neuer Code, Per-Path-Gates) | (Komponententests) | #2 | **FERTIG** - PR https://github.com/slicedelephant/bursa/pull/2 |
| E3 | 004 | 004-campaign-success | ✓ | ✓ | ✓ | ✓ | ✓ (neuer Code, Per-Path-Gates) | (Komponententests) | #3 | **FERTIG** - PR https://github.com/slicedelephant/bursa/pull/3 |
| E4 | 005 | 005-donor-retention | ✓ | ✓ | ✓ | ✓ | ✓ (neuer Code, Per-Path-Gates) | (Komponententests) | #4 | **FERTIG** - PR https://github.com/slicedelephant/bursa/pull/4 |
| E5 | 006 | 006-corporate-channel | ✓ | ✓ | ✓ | ✓ | ✓ (neuer Code, Per-Path-Gates) | (Komponententests) | #5 | **FERTIG** - PR https://github.com/slicedelephant/bursa/pull/5 |

## Wichtige Infra-Notizen (fuer alle Epics)
- **Frontend-Tests jetzt Jest** (jest-preset-angular, jsdom/headless), nicht mehr Karma. Run:
  `npm --prefix apps/web test` bzw. `test:cov`. Coverage-Gates pro Pfad in `apps/web/jest.config.js`
  (global floor 0). Fuer jedes Epic die neuen Pfade als 80%-Gate dort eintragen.
- **Backend-Tests:** `npm --prefix apps/api test` (Jest, coverage via test:cov).
- **Coverage-Interpretation:** 80% gilt auf dem NEUEN/geaenderten Code je Epic (Per-Path-Gates),
  nicht global (Altbestand aus Nacht-Build ist untested - globaler Retrofit waere separat).
- Verify pro Epic: `npm --prefix apps/api test` + `npm --prefix apps/web run test:cov` + beide `run build`.

## Log
- 2026-06-27: Direktive + E6/E7-Folgeauftrag erhalten, Entscheidungen geklaert, Tracker angelegt.
- 2026-06-27: **E1 FERTIG** (PR #1). Backend Trust-Projektion + Trust-UI + Karma->Jest-Migration. Naechster: E2 (Branch 003 von 002-trust-layer).
- 2026-06-27: **E3 FERTIG** (PR #3). Kampagnen-Erfolgs-Engine: Video-Embed per URL (YouTube/Vimeo, kein Upload) via purem video-url.util + @IsEmbeddableVideoUrl-Boundary-Validator + responsivem campaign-video (nocookie iframe). Geführtes Story-Framework (3 Vorher/Nachher-Prompts -> komponierte Story). Mehrstufiger Onboarding-Wizard (Basics->Story->Video/Review) mit Fortschritt + localStorage-Autosave (Zwischenspeichern), ersetzt das Single-Shot-Formular. Ein-Tap Share-Toolkit (WhatsApp/Telegram/Facebook-Deeplinks + Copy, EN/DE-Texte, mobile-first, "erste 3 Spender"-Framing). Prisma campaign_story_video (+videoUrl/storyBackground/storyChallenge/storyVision), Seed mit Beispiel-Videos. API 76 Tests, Web 102 Tests grün, Per-Path-80%-Gates, beide Builds grün, Seed läuft. Bewusst client-seitiges Zwischenspeichern (localStorage) statt server-seitigem Draft, um den geprüften Create/Verify-Pfad nicht zu destabilisieren. Naechster: E4 (Branch 005 von 004-campaign-success).
- 2026-06-27: **E4 FERTIG** (PR #4). Donor Retention Loop: Spender-Account (`/donor`) mit Spendenhistorie, Zuwendungsbelegen und Lifetime-Impact-Summary; Kartenspende wird via `OptionalJwtAuthGuard` eingeloggten DONOR-Konten zugeordnet (anonyme Spende bleibt möglich). Recurring = SIMULIERT über die PaymentProvider-Engine ("Sponsor a Student", Pause/Resume/Cancel + "Simulate next charge"), bewusst entkoppelt vom geprüften E2-All-or-Nothing-Capture-Pfad (eigener Sofort-Charge analog Corporate-SEPA). Impact-Updates als In-App-Feed + geloggte E-Mail (EmailLogger, kein SMTP, kein console.log): Update des Studierenden -> Fan-out an alle Abonnenten; Auto-Dank nach Spende; Meilenstein-Notifications bei 80/90/100%. Tribute/Widmung ("zu Ehren von"/"im Gedenken an") am Boundary validiert (cross-`@ValidateIf`), Anonymität erhalten. Prisma-Migration `donor_retention` (RecurringPledge/UpdateSubscription/Notification + Donation-Felder). API 152 Tests, Web 129 Tests grün, Per-Path-80%-Gates auf allen neuen Dateien, beide Builds grün, Seed um Donor-Retention-Demodaten erweitert + lauffähig. Frontend: Donor-Account-Seite, pure Helfer (donor-summary/notification-format/tribute-display) + Komponenten (notifications-feed/donation-history/recurring-list) gegated; donate-card um Tribute + Monatlich-Toggle erweitert; impact-update-form im Studi-Dashboard. Naechster: E5 (Branch 006 von 005-donor-retention).
- 2026-06-27: **E5 FERTIG** (PR #5). Corporate Channel: B2B-Sponsoring-Pfad als eigenes `corporate`-Modul (analog Recurring), berührt den geldkritischen E2-Spenderpfad nicht. Full-Tuition-CTA "Lücke schließen" mit exaktem Restbetrag + Gift-Tiers (Semester/Jahr/Komplett); Karte = sofortiger Capture über neues `PaymentProvider.chargeImmediately` (automatic capture, Mock + Stripe) → Kampagne sofort FUNDED, kein All-or-Nothing-Wait. Schließt ein Corporate-Ticket die Lücke zu 100%, werden die offenen Spender-Pledges via getestetem `DonationsService.captureCampaign` mitgecaptured (binäre AoN-Auszahlung gesichert). SEPA als Konzept gemockt (Zusage sofort SUCCEEDED, Rechnung PENDING → `settle` → PAID) mit USt-ID + PO. Beleg-Verzweigung: ohne Logo = Zuwendungsbestätigung (keine USt), mit Logo-Recognition = Sponsoring-Rechnung mit 19% USt (Netto bleibt 100% schulgebunden, USt nur Aufschlag). Named Scholarship + Logos als Recognition-Banner auf der Kampagne. ESG-/CSR-Dashboard im Sponsor-Account (Studierende/Länder/Schulen/Summe/Voll-/Named-Stipendien) + CSV- und PDF-Export (eigener dependency-freier Mini-PDF-Writer mit korrekten xref-Offsets, keine neue Infra). Prisma-Migration `corporate_channel` (CorporateSponsorship + Invoice + Enums). Pure Kerne (gift-tiers/invoice-VAT/esg+csv/pdf/recognition) als Coverage-Rückgrat. API 203 Tests, Web 154 Tests grün, Per-Path-80%-Gates auf allen neuen Dateien, beide Builds grün, Seed um Named-Scholarship-Sponsorship + Rechnung erweitert + lauffähig. Letzter der 5 Epics — Kette E1->E5 fertig. Naechster (Phase 2): Stakeholder-Research devs/ops -> E6/E7.
- 2026-06-27: **E2 FERTIG** (PR #2). All-or-Nothing Pledge/Capture-Engine: PaymentProvider um savePledge/captureOnGoalReached/payoutToSchool erweitert, Mock (Default) + echter StripePaymentProvider hinter PAYMENT_PROVIDER-Flag (lazy SDK, Fallback Mock). Kartenspende = PLEDGED (kein Charge), Capture aller Pledges bei Zielerreichung -> CAPTURED + Beleg, Kampagne FUNDED. Prisma-Migration payments_allornothing (DonationStatus +PLEDGED/CAPTURED/EXPIRED, +pledgeRef/+capturedAt). Frontend goal-math + campaign-progress (Restsumme, 80/90%-Meilenstein, Deadline, AoN-Hinweis). API 50 Tests, Web 46 Tests gruen, Per-Path-80%-Gates, beide Builds gruen, Seed laeuft. Naechster: E3 (Branch 004 von 003-payments-allornothing).
