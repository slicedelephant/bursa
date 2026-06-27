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
| E1 | 002 | 002-trust-layer | ✓ | - | - | - | - | - | - | IN ARBEIT (Spec fertig, naechster: plan) |
| E2 | 003 | - | - | - | - | - | - | - | - | OFFEN |
| E3 | 004 | - | - | - | - | - | - | - | - | OFFEN |
| E4 | 005 | - | - | - | - | - | - | - | - | OFFEN |
| E5 | 006 | - | - | - | - | - | - | - | - | OFFEN |

## Log
- 2026-06-27: Direktive erhalten, Entscheidungen geklaert, Tracker angelegt. Start E1.
