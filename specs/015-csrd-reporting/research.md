# Research & Clarify — Feature 015 CSRD-Reporting (E14)

Offene Fragen selbst recherchiert/entschieden (kein User-Input). Dokumentiert die
Architektur-Entscheidungen, die den Plan tragen.

## Entscheidung 1 — Ledger read-only wiederverwenden, kein zweites Log

**Entscheidung:** E14 importiert `LedgerModule` und nutzt `LedgerService`
ausschließlich lesend (`listForSchool`, `viewForSchool` und — für die globale
Sicht — einen zusätzlichen read-only `listAll()`/`listAllForReporting()`). Es gibt
**keine** Append-/Update-/Delete-Operation in E14.

**Begründung:** Constitution II (jeder geldnahe State-Change auditierbar) + IV
(Immutability). Das E12-Ledger ist bereits die Single Source of Truth, hash-verkettet
und tamper-evident. Ein zweites Log würde die Invariante verwässern und Drift erzeugen.
Compliance-Tagging hängt sich **additiv** über eine separate Tabelle an (Tag referenziert
`ledgerEntryId`), statt den Eintrag zu verändern.

**Verworfen:** ESG-Kategorie als Spalte am `LedgerEntry`. Das würde den Eintrag mutieren
(Hash-Chain bricht) bzw. ein Re-Hashing erzwingen — beides verletzt append-only.

## Entscheidung 2 — Standard-Mapping als reiner, illustrativer Mapper

**Entscheidung:** Ein reiner `esg-standard-mapper.ts` nimmt ein neutrales
`EsgAggregate` (Summen, Counts, Diversity-Verteilungen, ESG-Tag-Verteilung) und gibt je
Standard (GRI_2024, CSRD_ESRS, SASB, UN_SDG) eine Liste gemappter Kennzahlen mit
`{ code, label, value, unit, note }` zurück. Pro Standard eine kleine, statische
Mapping-Tabelle (welche Aggregat-Kennzahl auf welchen Standard-Code geht).

**Begründung:** Der echte Wert für den CFO ist die *Form* — "hier ist GRI 413/SASB-Code/
ESRS-S1/SDG-4, gefüttert aus eurem unveränderlichen Ledger". Ein vollständiges
normkonformes Schema (XBRL/ESEF, geprüfte Datenpunkt-Kataloge) ist Prototyp-Out-of-Scope
und wäre für den Discovery-Zweck Over-Engineering. Der Mapper ist deterministisch und
zu 100% unit-testbar (keine Netzaufrufe).

**Mapping-Skizze (illustrativ):**
- **UN_SDG:** SDG 4 (Quality Education) ← studentsSupported; SDG 5 (Gender Equality) ←
  femaleShare; SDG 10 (Reduced Inequalities) ← firstGenShare + countriesReached;
  SDG 1 (No Poverty) ← totalInvestedEur.
- **GRI_2024:** GRI 201-1 (economic value distributed) ← totalInvestedEur; GRI 405-1
  (diversity) ← gender-Verteilung; GRI 413-1 (local community) ← countriesReached.
- **CSRD_ESRS:** ESRS S1 (own workforce/social) ← Diversity; ESRS G1 (governance) ←
  Audit-Trail-Integrität; ESRS-Querbezug auf investierte Mittel.
- **SASB:** branchennahe Social-Capital-Codes ← investierte Mittel + Reichweite.

## Entscheidung 3 — Auditor-Zugang per Hash-Token (E8-Muster)

**Entscheidung:** `auditor-access-token.ts` spiegelt exakt das E8-`onboarding-token.ts`:
32 Byte Zufall → hex, nur SHA-256-Hash persistiert, `validate` prüft timing-safe Hash →
revoked → expired. `now` und Zufallsquelle injizierbar (deterministisch testbar). TTL
default 48h (CFO-User-Story).

**Begründung:** Bewährtes, dependency-freies Muster (Node `crypto`), schon im Repo
etabliert. Den Roh-Token nie speichern (Leak-Schutz). Der read-only Audit-Portal-Endpoint
ist bewusst unauthentifiziert-außer-Token (öffentlich erreichbar wie die E12-Transparency-
Seite), liefert aber nur einen gescopten Read-Only-Auszug und nie Schreibzugriff.

**Verworfen:** JWT mit kurzer Lebensdauer. Wäre an unser Login-System gekoppelt; ein
externer Auditor hat kein Bursa-Konto. Der Hash-Token-Link ist reibungsärmer und folgt
dem bestehenden Stripe-Connect-artigen One-Time-Link-Muster.

## Entscheidung 4 — Exporte über die E5-Utils, mit Audit-Annotationen

**Entscheidung:** PDF über `corporate/pdf.util.ts` `buildSimplePdf(title, lines)`, CSV
über dieselbe `cell()`-Escaping-Linie wie `corporate/esg.util.ts`. Ein reiner
`audit-annotation.ts` baut je Kennzahl eine Fußnote `[n] entryHash=… seq=… amount=…`
und hängt einen Annotations-Block ans Report-Ende (Quellen-Nachweis).

**Begründung:** Keine zweite PDF-/CSV-Implementierung, keine neue Library (Linie des
E5-PDF-Writers). Die Fußnoten machen den Export "audit-ready": jede Zahl ist auf
konkrete, unveränderliche Ledger-Einträge zurückführbar.

## Entscheidung 5 — Completeness-Score & Year-over-Year als reine Kerne

**Entscheidung:** `data-quality.ts` rechnet je optionalem Diversity-Feld
`captured/total → pct` + Gesamtnote (Durchschnitt) + Schwellen-Hinweis ("collect more"
unter Zielwert). `esg-trend.ts` gruppiert investierte EUR / Scholar-Count /
Diversity-Anteile je Kalenderjahr und bildet das Delta zum Vorjahr.

**Begründung:** Beides ist reine Arithmetik über bereits geladene Daten — gehört in
testbare Kerne (Per-Path-80%-Gate), nicht in den Service. Spiegelt das E7-/E8-Muster
(read-only Derivation, pure Format/Aggregations-Helfer).

## Entscheidung 6 — Diversity-Felder additiv & optional

**Entscheidung:** `StudentProfile.gender Gender?`, `birthYear Int?`, `firstGen Boolean?`
— alle nullable. `country` ist bereits vorhanden und wird mitgenutzt. Ein reiner
`age-band.ts` mappt `birthYear` (+ Referenzjahr) auf ein Altersband ("<25","25-29",
"30-34","35+").

**Begründung:** Roadmap fordert "optionales Fielding — kein Privacy-Shock". Nullable
Felder brechen E8-Onboarding und E11-KYC nicht (kein required-Boundary-Change). Der Seed
füllt synthetische Demo-Werte, damit Aggregation/Score/Trend sichtbar sind.

## Entscheidung 7 — Modul-Schnitt: eigenes `esg`-Modul

**Entscheidung:** Neues Feature-Modul `apps/api/src/esg/` (analog `corporate`,
`reconciliation`). Importiert `LedgerModule` (read-only), `SecurityModule`
(`AuditService`), `ObservabilityModule` (`AnalyticsService`). Controller: ein
ADMIN-gegateter `EsgAdminController` (Tagging, Report, Data-Quality, Trend, Grants,
Diversity-Capture) und ein öffentlicher `AuditPortalController` (Token-gegatet).

**Begründung:** Hohe Kohäsion, niedrige Kopplung (Constitution IV). Trennung von
Corporate (E5) hält die Module fokussiert; E14 ist eine Admin-/Compliance-Surface, kein
Sponsor-Self-Service. Web: die Corporate-ESG-Dashboard-Area (`features/corporate/`) wird
um die CSRD-Bausteine erweitert, nicht geforkt — plus eine ADMIN-Seite `/admin/csrd`.
