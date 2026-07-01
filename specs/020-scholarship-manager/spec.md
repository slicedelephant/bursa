# Feature 020 — Self-Serve Corporate Scholarship Program Manager (E19)

**Epic:** E19 · **Größe:** XL · **Primär:** Corporate · **Hängt ab von:** E1 (Trust-Layer), E2 (Payment-Engine), E5 (Corporate-Channel), E11 (KYC) · **Erstes Epic der Welle C (Enterprise)**

## Warum (Problem)

Große Firmen wollen eigene Stipendienprogramme fahren — als Talent-Pipeline und für
ESG-Branding. Heute geht das nur über Fremdtools wie Kaleidoscope oder SmarterSelect.
Bursa kann bisher nur "Kampagnen von Studierenden". E19 hebt Bursa vom Marktplatz zur
**Enterprise-Stipendien-Plattform**: eine Firma baut ihr gebrandetes Programm, sammelt
Applications über ein konfigurierbares Formular, lässt ein Reviewer-Team scoren, kürt
Gewinner und zahlt den Award **an die Schule aus, nie an den Scholar** (Constitution II).
Das schafft Daten-Lock-in und ist der größte Enterprise-Umsatzhebel.

**E19 baut die Geld-Infrastruktur NICHT neu.** Der Award-Payout läuft über den
bestehenden E2/E12-Pfad (`PayoutsService` → `PaymentProvider.createPayout` → Ledger),
Scholar-Verifizierung über E11 (`KycService`), Diversity/Impact-Reporting über E14
(`aggregateDiversity`, `buildSimplePdf`), Scholar-Kommunikation über E17
(`MessagingProvider`), PDF/CSV über E5. Neu ist nur die Programm-/Application-/Review-/
Award-/SRM-Schicht darüber.

## User Stories

- Als **Head of CSR** möchte ich eine gebrandete Stipendien-Seite auf Bursa fahren
  (Logo, Farben, URL-Slug), damit Kandidaten "Firma XYZ Scholarship 2026" sehen.
- Als **HR-Manager** möchte ich ein Custom-Application-Formular mit eigenen Feldern und
  einfacher Conditional-Logic bauen, damit ich direkte Talent-Signale aus der Bewerbung
  ziehe.
- Als **Reviewer** möchte ich Bewerbungen anhand einer Scoring-Rubric bewerten und
  kommentieren, damit die Auswahl fair und nachvollziehbar ist.
- Als **Program-Owner** möchte ich Gewinner küren und pro Scholar einen Award-Betrag
  festlegen, der **an die Schule** ausgezahlt wird — optional in Tranchen mit einem
  GPA-Threshold für Tranche 2.
- Als **Program-Owner** möchte ich Scholars über Jahre tracken (enrolled → graduated →
  working) und einen Impact-Report mit Diversity-Metriken für meinen ESG-Bericht ziehen.
- Als **Program-Owner** möchte ich mein Programm für den nächsten Jahrgang (2027)
  verlängern, ohne alles neu aufzusetzen.

## Scope (was wird gebaut)

- **Programm-Admin:** Eine Firma (SPONSOR) legt ein `ScholarshipProgram` an — Name,
  Logo, Farb-Branding (2 Hex-Werte), URL-Slug (eindeutig). Ein Default-Programm-Cycle
  (Jahr) wird mit erzeugt.
- **Application-Builder:** Ein schema-getriebenes Formular (`ApplicationForm` +
  `FormField[]`). Feld-Typen: `TEXT`, `LONG_TEXT`, `NUMBER`, `SELECT`, `BOOLEAN`,
  `EMAIL`. Pro Feld: Label, Pflicht-Flag, Optionen (bei SELECT), Rubric-Gewicht,
  optionale Conditional-Logic (`showIf` auf ein anderes Feld + Wert).
- **Public Application:** Kandidaten füllen das Formular über einen Token-Link aus
  (`/apply/:token`, kein Login) — Antworten werden gegen das Schema validiert und
  Conditional-Sichtbarkeit ausgewertet. Status-Link zeigt den Bearbeitungsstand.
- **Review-Workflow:** Bis zu 10 Reviewer je Programm (`ProgramReviewer`). Jeder Reviewer
  scort pro Rubric-Feld (0–5) mit Kommentar (`ReviewScore`). Der Aggregator bildet den
  gewichteten Konsens-Score je Application; eine Award-Decision-Funktion rankt und
  markiert Gewinner nach Budget/Slot-Kapazität.
- **Award-Management:** Program-Owner kürt Gewinner (`ScholarshipAward`), legt Betrag pro
  Scholar + Ziel-Schule fest. **Auto-Disbursement an die Schule** via E2/E12. Optionale
  zweite Tranche wird erst freigegeben, wenn eine GPA-Bedingung erfüllt ist
  (`conditional-disbursement`) — auch die zweite Tranche geht an die Schule.
- **SRM:** Post-Award-Dashboard mit Scholar-Status-State-Machine
  (`AWARDED → ENROLLED → GRADUATED → WORKING`, plus `WITHDRAWN`). Milestone-Tracking,
  Alumni-Network-Flag, SMS/E-Mail an Scholars über E17-Messaging (Mock).
- **Impact-Reporting:** PDF/CSV der Outcomes + Diversity-Metriken (E14-Reuse).
- **Multi-Cycle:** Programme wiederholen sich (`ProgramCycle` je Jahr). Renewal legt einen
  neuen Cycle für das Folgejahr an und kopiert das Formular-Schema.

## Functional Requirements

- **FR-1 (Programm-Ownership):** Nur ein `SPONSOR` legt/verwaltet ein `ScholarshipProgram`.
  `slug` ist global eindeutig; Branding = `logoUrl` + zwei Hex-Farben (validiert).
- **FR-2 (Form-Schema-Validierung):** Das Formular-Schema wird rein validiert
  (`validateFormSchema`): eindeutige Feld-Keys, SELECT braucht ≥1 Option,
  Rubric-Gewichte ≥ 0, Conditional-Referenzen zeigen auf existierende Felder.
- **FR-3 (Answer-Validierung + Conditional-Logic):** Eingereichte Antworten werden gegen
  das Schema geprüft (`validateAnswers`): Pflichtfelder da, Typen passen, SELECT-Werte
  aus der Optionsliste. Ein Feld mit unerfülltem `showIf` ist ausgeblendet und darf nicht
  Pflicht sein (`evaluateVisibility`, deterministisch, rein).
- **FR-4 (Rubric-Aggregation):** `aggregateRubric` bildet aus mehreren Reviewer-Scores je
  Feld den gewichteten Mittelwert und den Konsens-Score der Application (0–100
  normalisiert). Rein, keine Mutation, kein I/O.
- **FR-5 (Award-Decision):** `decideAwards` rankt Applications nach Konsens-Score und
  markiert Gewinner bis Budget/Slots erschöpft sind. Ties deterministisch nach `appId`.
- **FR-6 (Disbursement an die Schule):** Ein Award zahlt über `PayoutsService`-analoge
  Logik an die **verifizierte Schule** aus (`PaymentProvider.createPayout`,
  `schoolName`/`accountRef`), nie an den Scholar. Jede Auszahlung wird als
  `LedgerEntry` (`entryType: DISBURSEMENT`) im append-only Ledger festgehalten
  (Constitution II + IV).
- **FR-7 (Conditional-Tranche):** `decideConditionalRelease` gibt Tranche 2 nur frei, wenn
  die GPA-Bedingung (`>= threshold`) erfüllt ist; sonst `HELD`. Auch die freigegebene
  Tranche geht an die Schule.
- **FR-8 (Scholar-Verifizierung = E11):** Ein Scholar wird über den bestehenden
  KYC-Pfad verifiziert (`KycService.startCase`), nicht neu gebaut. Award-Disbursement
  setzt eine verifizierte Schule voraus (E8 `payoutVerified`).
- **FR-9 (Scholar-Status-State-Machine):** `nextScholarStatus` erlaubt nur gültige
  Übergänge; ungültige werfen an der Grenze. Zustände deterministisch, injiziertes `now`
  für Milestone-Zeitstempel.
- **FR-10 (Impact/Diversity-Report):** `buildProgramOutcome` aggregiert Scholar-Outcomes;
  Diversity kommt aus E14 `aggregateDiversity`. Export als CSV (`toCsv`-Stil) und PDF
  (`buildSimplePdf`, E5-Reuse).
- **FR-11 (Multi-Cycle/Renewal):** `planRenewal` erzeugt den Folge-Cycle (Jahr + 1),
  kopiert das Formular-Schema, setzt Zähler zurück. Rein, deterministisch.
- **FR-12 (Application-Token):** Public-Application- und Status-Links laufen über einen
  gehashten Einmal-/Scope-Token (E8/E11/E14-Muster: `tokenHash`, nie Roh-Token in der DB).
- **FR-13 (Envelope):** Alle JSON-Routen nutzen `{ success, data?, error? }`; Validierung
  an der Grenze (DTOs, whitelist, type-coercion off); Fehler laut via `DomainException`.

## Key Entities

- **ScholarshipProgram** — gehört einem `CorporateProfile`; Branding + Slug; hat einen
  aktiven `ProgramCycle`, ein `ApplicationForm`, Reviewer, Applications, Awards.
- **ApplicationForm / FormField** — schema-getriebenes Formular; Felder mit Typ, Pflicht,
  Optionen, Rubric-Gewicht, optionaler Conditional-Logic.
- **Application / ApplicationAnswer** — eine Bewerbung + ihre Feld-Antworten; Status
  `SUBMITTED → UNDER_REVIEW → SHORTLISTED → AWARDED / REJECTED`.
- **ProgramReviewer / ReviewScore** — Reviewer-Zuordnung + Scores je Feld mit Kommentar.
- **ScholarshipAward** — Gewinner-Award; Betrag, Ziel-Schule, Payout-Referenz, optionale
  zweite Tranche mit GPA-Threshold + Release-Status.
- **ScholarRelationship** — Post-Award-Beziehung; Scholar-Status, Milestones, Alumni-Flag.
- **ProgramCycle** — ein Jahrgang (Jahr, Budget, Slots, Deadline); trägt die Renewal-Kette.

## Success Criteria

- 15+ Firmen mit eigenem Programm in Jahr 1; 150+ Applications pro Runde; Setup < 4h;
  Outcome-Capture 80%; Renewal-Rate 90% (Produktmetriken, im Prototyp nicht messbar).
- Prototyp-messbar: ein Sponsor legt ein Programm mit Formular an, ≥3 Applications kommen
  rein, Reviewer scoren, ein Award wird gekürt und **an die Schule** ausgezahlt
  (Ledger-Eintrag vorhanden), eine zweite Tranche wird per GPA-Threshold freigegeben, ein
  Impact-Report (CSV+PDF) mit Diversity kommt raus, ein Renewal legt Cycle 2027 an.

## Out of Scope (ehrlich)

- **Kein Drag-Drop-WYSIWYG-Builder** — das Formular ist schema-getrieben (Feld-Liste mit
  Typ/Optionen/Conditional), kein visuelles Layout-Tool. Pragmatischer Prototyp-Slice.
- **Kein echter SMS-/E-Mail-Versand** — Scholar-Kommunikation läuft nur über den
  `MockMessagingProvider` (E17-Naht); Real-Provider sind kompilierende Skeletons, in
  Tests nie aktiv.
- **Kein HRIS-/Alumni-CRM-Sync** — "working at company" / Alumni-Flag sind manuelle
  SRM-Felder, keine Workday/SAP-SuccessFactors-Integration.
- **Conditional-Payouts sind Prototyp-Logik** — die GPA-Bedingung ist eine reine
  Schwellwert-Entscheidung auf einem manuell gepflegten GPA-Feld, kein Registrar-Feed und
  kein Echtzeit-Notensystem.
- **Branding = Slug + Logo + 2 Farben** — kein echtes White-Label mit eigener Domain/DNS,
  kein Custom-CSS, keine Sub-Domain.
- **Kein öffentlicher Bewerber-Account** — der Kandidat bewirbt sich anonym über den
  Token-Link; es gibt kein Bewerber-Login, keine Bewerber-Historie über Programme hinweg.
- **Kein Zahlungseingang von der Firma** — E19 modelliert nur die Award-Auszahlung an die
  Schule (E2/E12). Wie die Firma ihr Programm-Budget an Bursa zahlt (Invoice/SEPA), ist
  E5-Terrain und hier bewusst nicht dupliziert.
- **Single-Instance** — keine verteilte Nebenläufigkeit über Award-Entscheidungen hinaus;
  der Ledger-Append serialisiert pro Schule wie in E12.
