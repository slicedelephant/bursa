# Feature 015 — ESG/CSR Audit-Trail & CSRD-Compliance-Reporting (E14)

**Epic:** E14 · **Größe:** L · **Primär:** Corporate · **Hängt ab von:** E5, E7, E12
**Branch:** `015-csrd-reporting` · **Status:** Entwurf

## Warum (Problem)

CSRD (Corporate Sustainability Reporting Directive) zwingt große Firmen, ihre
ESG-Claims extern prüfen zu lassen. Ohne ein CSRD-/GRI-fähiges Reporting auf der
Bursa-Plattform gibt es kein CFO-Buy-in — und damit kein ernsthaftes
Corporate-Geld. Bursa hat mit E12 bereits ein append-only, hash-verkettetes
**Ledger** als Single Source of Truth für jede Geldbewegung. E14 legt darauf eine
**read-only** Reporting-Schicht: Compliance-Tagging, Diversity-Aggregation,
Standard-Mapping (GRI/CSRD/SASB/SDG), Audit-annotierte Exporte, zeitlich begrenzten
Auditor-Zugang, einen Datenqualitäts-Score und einen Year-over-Year-Trend.

**Kernprinzip (Constitution II + IV):** Das Ledger bleibt append-only. E14 **liest**
nur. Es baut kein zweites Transaktions-Log. Geld fließt weiterhin ausschließlich an
die Schule, nie an die Studierenden — Reporting ändert daran nichts.

## User Stories

1. **Als CFO** möchte ich einen CSRD-/GRI-konformen ESG-Report (PDF/CSV) exportieren,
   der jeder berichteten Kennzahl die Quell-Ledger-Einträge als Fußnoten beilegt, damit
   mein Auditor die Zahlen stichprobenartig gegen das unveränderliche Ledger prüfen kann.
2. **Als Compliance-Officer** möchte ich eine Ledger-Bewegung mit einer ESG-Kategorie
   taggen (z.B. *Quality Education*, *Gender Equality*, *Geographic Reach*), ohne den
   Ledger-Eintrag selbst zu verändern, damit das Tagging revisionssicher additiv bleibt.
3. **Als HR-Manager** möchte ich einen Diversity-Report mit hoher Datenqualität, aber
   **optionalem** Fielding (Gender, Altersband, Land, First-Gen) beim Scholar-Onboarding,
   damit ich aussagekräftig berichten kann, ohne einen Privacy-Shock auszulösen.
4. **Als externer Auditor** möchte ich einen zeitlich begrenzten (z.B. 48h),
   read-only Zugang zum Audit-Trail per Token-Link, damit ich Transaktionen verifizieren
   kann, ohne ein Dauer-Login oder Schreibrechte zu erhalten.
5. **Als Admin** möchte ich einen Datenqualitäts-Score ("80% Gender erfasst, 15%
   Geographie — mehr sammeln"), damit ich weiß, wo die Diversity-Daten lückenhaft sind.
6. **Als Board-Mitglied** möchte ich einen Year-over-Year-Vergleich (investierte EUR,
   Scholar-Anzahl, Diversity-Anteile) für Board-Präsentationen.

## Scope (was wird gebaut)

- **Immutable Transaction Log (wiederverwendet):** Quelle ist das E12-`LedgerService`
  (append-only, hash-verkettet). E14 liest Einträge read-only und macht sie für
  Compliance sichtbar/aggregierbar. **Kein neues Ledger.**
- **Compliance-Tagging:** Ein Admin taggt einen Ledger-Eintrag mit einer
  ESG-Kategorie. Das Tag ist eine **separate** Tabelle (`EsgTag`), die per `ledgerEntryId`
  auf den Eintrag referenziert — der Eintrag wird nie mutiert. Re-Tagging ersetzt das
  vorhandene Tag idempotent (eindeutig pro Ledger-Eintrag).
- **Diversity-Data-Capture:** Optionale Felder am `StudentProfile` (Gender, Geburtsjahr →
  Altersband, Land [vorhanden], First-Gen). Onboarding/KYC (E8/E11) bleiben unberührt;
  alle Felder sind nullable und brechen keinen bestehenden Flow.
- **Report-Builder:** Standard wählen (GRI 2024, CSRD/ESRS, SASB, UN SDG). Ein reiner
  Mapper bildet aggregierte Ledger-/Diversity-Daten auf die Kennzahlen des Standards ab
  (illustrativ, kein zertifiziertes Disclosure-Schema). Ein erzeugter Report wird als
  `EsgReport` persistiert (Standard, Zeitraum, Kennzahl-Snapshot).
- **PDF/CSV-Export mit Audit-Annotations:** Reports werden über die **E5-Utils**
  (`buildSimplePdf`, CSV-`cell()`-Escaping) exportiert. Jede Kennzahl trägt Fußnoten
  auf die beitragenden Ledger-`entryHash`/`sequence`-Werte.
- **Export-Access-Control:** Ein Admin erzeugt einen `AuditorAccessGrant` mit Ablaufzeit.
  Der Raw-Token wird **einmalig** gezeigt; persistiert wird nur der SHA-256-Hash
  (E8-Token-Muster). Ein öffentlicher, token-gegateter Read-Only-Endpoint liefert den
  Audit-Trail-Auszug. Abgelaufene/widerrufene Grants liefern 401/403.
- **Data-Quality-Dashboard:** Reiner Completeness-Score je Diversity-Feld (erfasst /
  gesamt → Prozent) plus eine Gesamtnote mit "collect more"-Hinweisen.
- **Trend-Viz:** Reiner Year-over-Year-Kern (EUR investiert, Scholar-Count,
  Diversity-Anteile je Jahr + Delta zum Vorjahr) für die Board-Ansicht.

## Functional Requirements

- **FR-1 (Tagging):** `POST /admin/esg/tags` taggt einen Ledger-Eintrag (ADMIN) mit einer
  validen ESG-Kategorie. Eindeutig pro `ledgerEntryId`; Re-Tag ersetzt. Der Ledger-Eintrag
  bleibt unverändert (append-only-Invariante).
- **FR-2 (Kategorie-Validierung):** Nur Kategorien aus einer fest definierten Enum
  (`EsgCategory`) sind zulässig; ungültige Werte → 400 am Boundary.
- **FR-3 (Diversity):** `StudentProfile` erhält optionale `gender`, `birthYear`, `firstGen`.
  Erfassung über einen ADMIN/Onboarding-Pfad; **alle Felder nullable**.
- **FR-4 (Aggregation):** Ein reiner Diversity-Aggregator liefert Verteilungen
  (z.B. "% female", Land-Verteilung, Altersband-Verteilung) aus den erfassten Profilen.
- **FR-5 (Standard-Mapping):** Ein reiner Mapper bildet aggregierte Daten auf die
  Kennzahlen von GRI 2024 / CSRD-ESRS / SASB / UN SDG ab. `GET /admin/esg/report?standard=…&year=…`
  liefert den gemappten Report; `POST /admin/esg/reports` persistiert einen Snapshot.
- **FR-6 (Export):** `GET /admin/esg/reports/:id/export.csv|.pdf` exportiert den Report
  über die E5-Utils, inkl. Audit-Annotation-Fußnoten auf die Quell-`entryHash`.
- **FR-7 (Auditor-Grant):** `POST /admin/esg/auditor-grants` erzeugt einen Grant mit
  Ablauf; Raw-Token einmalig in der Response. `POST …/:id/revoke` widerruft.
  `GET /audit-portal/:token` liefert read-only den Audit-Trail-Auszug; abgelaufen/widerrufen
  → 401/403. **Kein Schreibzugriff über diesen Pfad.**
- **FR-8 (Data Quality):** `GET /admin/esg/data-quality` liefert je Diversity-Feld
  einen Completeness-Score + Gesamtnote.
- **FR-9 (Trend):** `GET /admin/esg/trend` liefert die Year-over-Year-Serie + Deltas.
- **FR-10 (Audit-Log):** Report-Generierung, Tag-Setzen, Grant-Erstellung/-Nutzung werden
  über die **E6-`AuditService`** protokolliert; ESG-/Report-Events über die
  **E7-`AnalyticsService`** (fire-and-forget) emittiert.

## Key Entities

- **EsgTag** — `(ledgerEntryId unique, category EsgCategory, taggedByUserId?, note?, createdAt)`.
  Additives Tag auf einen unveränderlichen Ledger-Eintrag.
- **EsgReport** — `(standard ReportStandard, periodStart, periodEnd, metricsJson, createdByUserId?, createdAt)`.
  Persistierter Kennzahl-Snapshot eines erzeugten Reports.
- **AuditorAccessGrant** — `(label, tokenHash unique, scope?, expiresAt, revokedAt?, lastUsedAt?, createdByUserId?, createdAt)`.
  Zeitlich begrenzter, read-only Auditor-Zugang (nur Hash gespeichert).
- **StudentProfile (erweitert)** — neue optionale `gender Gender?`, `birthYear Int?`,
  `firstGen Boolean?`. `country` existiert bereits.
- **Enums** — `EsgCategory` (QUALITY_EDUCATION, GENDER_EQUALITY, GEOGRAPHIC_REACH,
  POVERTY_REDUCTION, ECONOMIC_GROWTH), `ReportStandard` (GRI_2024, CSRD_ESRS, SASB, UN_SDG),
  `Gender` (FEMALE, MALE, NON_BINARY, UNDISCLOSED).

## Success Criteria

- Ein Admin kann einen Ledger-Eintrag taggen; der Eintrag bleibt byte-identisch
  (Hash-Chain-Integrität unverändert verifizierbar).
- Ein Admin kann einen GRI/CSRD/SASB/SDG-Report erzeugen, der gemappte Kennzahlen mit
  Fußnoten auf Quell-`entryHash` zeigt, und ihn als PDF/CSV exportieren.
- Ein Auditor öffnet `audit-portal/:token` und sieht read-only den Trail; nach Ablauf
  oder Revoke ist der Zugang gesperrt.
- Das Data-Quality-Dashboard zeigt pro Feld einen Completeness-Score.
- Der Year-over-Year-Trend zeigt EUR/Scholar/Diversity je Jahr mit Delta.
- API- und Web-Tests grün, Per-Path-80%-Gates auf allen neuen pure-logic-Dateien,
  beide Builds grün, Seed läuft, Migration `csrd_reporting` angewandt + `migrate status`
  up to date.

## Out of Scope (ehrlich)

- **Kein zertifiziertes Disclosure.** Das GRI-2024-/CSRD-ESRS-/SASB-/UN-SDG-Mapping ist
  **illustrativ** (Prototyp-Reporting), kein geprüftes, normkonformes Offenlegungsschema.
- **Keine echte externe Assurance-Integration** (kein Prüfer-Workflow, keine
  Wirtschaftsprüfer-Signatur, kein XBRL/ESEF-Tagging).
- **Diversity-Daten optional/synthetisch.** Felder sind freiwillig; der Seed nutzt
  synthetische Demo-Daten. Kein echter HRIS-Import, keine Self-Service-Erhebung beim
  Studierenden in diesem Slice.
- **Kein zweites Ledger / keine Mutation des E12-Ledgers.** E14 ist rein read/aggregate.
- **Single-Instance.** Auditor-Token-Store + Reports sind Postgres-backed, aber kein
  verteiltes Rechte-/Sharing-System, kein S3-Export-Bucket, kein Rate-Limit-Redis.
- **Kein Volunteering-Tracking** (im Roadmap-Scope als optional genannt) — Fokus auf den
  Geld-/Scholar-Trail.
