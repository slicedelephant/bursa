# Feature 022 — Payroll-Match & HRIS-Kopplung (E21)

**Epic:** E21 · **Größe:** L · **Primär:** Corporate · **Hängt ab von:** E5 (Corporate-Channel), E13 (Employer-Matching) · **Welle C (Enterprise & Skalierung)**

## Warum (Problem)

E13 hat die **leichte** Stufe des Corporate-Matchings gebaut und validiert: ein Spender
gibt seine Arbeits-E-Mail an, Bursa erkennt den Arbeitgeber, rechnet das Match aus, der
Spender reklamiert es selbst (Claim). Das funktioniert, ist aber Donor-getrieben und manuell.

E21 ist die **tiefe** Stufe für reife Enterprise-Kunden: der Arbeitgeber koppelt sein
HRIS (ADP, Workday, Paychex, Paylocity, UKG, BambooHR) an Bursa. Mitarbeiter spenden dann
**direkt vom Gehalt** (Payroll-Giving), das Matching läuft **automatisch** über eine zentral
definierte Firmen-Regel, und die gematchte Spende wird als Payroll-Line-Item zurück ans HRIS
gemeldet. Das ist ein neuer Revenue-Stream (Setup-Fee) und schließt die Corporate-Achse ab.

**Modell-Korrektur (harte Regel):** Auch die gematchte Payroll-Spende fließt am Ende **an die
SCHULE, nie an den Studierenden** (Constitution II). Payroll-Giving ist ausschließlich ein
**Donor-seitiger Finanzierungs-Mechanismus** (woher das Geld des Spenders kommt) — kein neuer
Auszahlungspfad. Die eigentliche Auszahlung bleibt der E2-`PaymentProvider.payoutToSchool` /
E12-Ledger-Pfad.

**E21 baut das Matching NICHT neu.** Die Match-Berechnung (Ratio × Spende, gedeckelt durch
den verbleibenden Jahres-Cap) und die Balance-Logik kommen aus E13 (`match-amount.ts`) und
werden für die firmenweite Regel wiederverwendet/erweitert. Neu ist nur die **HRIS-/Payroll-
Schicht darüber**: der `EmployeeDataProvider`-Seam (Mock by default, wie der E2-`PaymentProvider`),
das Payroll-Giving-Programm, die firmenweite Match-Regel mit Per-Mitarbeiter-Tracking, die
OAuth2-Read-Only-Scope-Prüfung, der Sync-/Compliance-Trail (über den E6-`AuditService`) und das
Payroll-Deduction-Line-Item zurück ans HRIS (Mock).

## User Stories

- Als **HR-Manager einer 1000-Personen-Firma** möchte ich Payroll-Giving mit ADP koppeln,
  damit meine Mitarbeiter direkt vom Gehalt spenden können — mit read-only OAuth2-Scopes,
  damit Bursa niemals Gehälter schreiben kann.
- Als **CFO** möchte ich die Matching-Regel zentral definieren (z.B. 1:1, max 500 €/Mitarbeiter/Jahr),
  und das System soll für jeden Mitarbeiter tracken, wie viel Budget schon verbraucht ist.
- Als **Mitarbeiter** möchte ich Payroll-Giving mit einem Opt-in aktivieren und sofort sehen,
  wie viel Match-Budget mir dieses Jahr noch bleibt — ohne selbst einen Claim einreichen zu müssen.
- Als **Corporate-Admin** möchte ich eine Payroll-Giving-Campaign ("Match Month") auslösen,
  die für alle aktivierten Mitarbeiter das automatische Match berechnet und als Gift an die
  Schule bucht.
- Als **Compliance-Verantwortlicher** möchte ich einen lückenlosen Sync-/Audit-Trail sehen
  (welches HRIS, welche Scopes, wann synchronisiert, was gematcht wurde), damit ich die
  Datenverarbeitung nachweisen kann.
- Als **Bursa-Betreiber** möchte ich HRIS-Provider ohne Domänen-Änderung austauschen können
  (Mock im Prototyp, echtes ADP/Workday später), genau in der Linie des E2-Payment-Seams.

## Scope (was wird gebaut)

- **HRIS-Connectors (gemockt):** OAuth2/API-Connectors zu ADP Workforce Now, Workday, Paychex,
  Paylocity, UKG, BambooHR hinter einem `EmployeeDataProvider`-Seam. Default ist ein
  deterministischer `MockEmployeeDataProvider` — **keine echten OAuth-Redirects oder API-Calls**.
  Real-Skeletons (ADP/Workday) kompilieren, werden aber in Tests nie ausgeführt.
- **EmployeeDataProvider-Abstraktion:** liefert pro Mitarbeiter Employee-ID, Salary-Band,
  Payroll-Cycle (WEEKLY/BIWEEKLY/SEMIMONTHLY/MONTHLY) und Pre-Tax-Eligibility. Read-only.
- **Corporate-Dashboard:** zeigt, wie viele Mitarbeiter Payroll-aktiviert sind, den HRIS-
  Verbindungsstatus, und der Admin kann eine Payroll-Giving-Campaign ("Match Month") auslösen.
- **Matching-Regel-Engine:** die Firma legt eine Regel fest (Ratio, z.B. 1:1, plus Cap, z.B.
  500 €/Mitarbeiter/Jahr). Das System trackt pro Mitarbeiter, wie viel schon verbraucht ist
  (baut auf E13 `match-amount.ts` / Balance auf).
- **Security/Compliance:** OAuth2 **read-only** Scopes werden validiert (Schreib-Scopes werden
  abgelehnt), jeder Sync und jedes Match schreibt einen Compliance-Trail-Eintrag über den
  E6-`AuditService`.
- **Payroll-Deduction-Umleitung:** die gematchte Spende wird als Payroll-Line-Item zurück ans
  HRIS emittiert (Mock write-back) und das Gift fließt über E2/E12 an die SCHULE.

## Functional Requirements

- **FR-1 (Geld immer an die Schule):** Jeder gematchte Payroll-Beitrag wird als Gift auf die
  Kampagne der Schule gebucht (normale `CORPORATE`-Donation) und über den E2/E12-Pfad
  ausgezahlt. Kein Feld, kein Pfad zahlt an einen Mitarbeiter oder Studierenden.
- **FR-2 (Matching auf E13):** Der Match-Betrag pro Mitarbeiter wird mit der reinen E13-
  `computeMatch`-Logik berechnet (Ratio × Spende, gedeckelt am verbleibenden Per-Mitarbeiter-
  Jahres-Cap). Die firmenweite Regel liefert nur Ratio + Cap; die Rechnung bleibt E13.
- **FR-3 (HRIS-Provider-Seam):** Employee-Daten kommen ausschließlich über den
  `EmployeeDataProvider` (Symbol-DI, Mock-Default via env-gated Factory). Kein Domänen-Code
  kennt ADP/Workday direkt.
- **FR-4 (Read-only-Scopes):** Beim Verbinden eines HRIS wird geprüft, dass die angeforderten
  Scopes **read-only** sind. Enthält der Scope-Satz einen Schreib-/Write-/Payroll-Write-Scope,
  wird die Verbindung mit `INVALID_SCOPES` abgelehnt.
- **FR-5 (Per-Mitarbeiter-Balance):** Für jeden aktivierten Mitarbeiter wird pro Kalenderjahr
  getrackt, wie viel Match-Budget verbraucht ist. Ein Match, das über den Cap ginge, wird
  gedeckelt (E13-Invariante: nie negativ, nie über Cap).
- **FR-6 (Payroll-Cycle-Scheduler):** Aus dem Payroll-Cycle und einem injizierten `now` wird
  rein entschieden, ob eine Deduction in dieser Periode fällig ist (deterministisch, kein
  `Date.now()` in der reinen Logik).
- **FR-7 (Pre-Tax/Minor-Unit-Deduction):** Die Payroll-Deduction wird minor-unit-sicher
  berechnet (integer cents), optional pre-tax reduziert; nie Floats auf dem Geld-Pfad.
- **FR-8 (Compliance-Trail):** Jede HRIS-Verbindung, jeder Sync und jede Campaign schreibt
  einen Audit-Eintrag über den E6-`AuditService` (PII-redigiert). Der Compliance-Trail ist
  read-only abrufbar.
- **FR-9 (Signierter Webhook):** HRIS-Sync-Statusmeldungen laufen über einen signaturgeprüften
  Webhook im E6-Muster (`x-hris-signature`, eigenes Secret), fail-closed mit `INVALID_SIGNATURE`.
- **FR-10 (`{success,data,error}`):** Alle Endpunkte antworten im globalen Envelope; Boundary-
  Fehler werden als `DomainException(code, message, status)` geworfen.

## Key Entities

- **HrisConnection** — die OAuth2-Kopplung eines Corporate-Sponsors an ein HRIS (Provider,
  angeforderte Scopes, Status, letzter Sync). Read-only-Scopes erzwungen.
- **PayrollGivingProgram** — das Payroll-Giving-Programm eines Sponsors (Name, Status, an
  eine `HrisConnection` gebunden).
- **PayrollMatchRule** — die firmenweite Regel eines Programms (Ratio ×100, Per-Mitarbeiter-
  Jahres-Cap in cents). Speist die E13-`computeMatch`.
- **EmployeePayrollProfile** — ein aktivierter Mitarbeiter (Employee-ID aus dem HRIS, Salary-
  Band, Payroll-Cycle, Pre-Tax-Eligibility, verbrauchtes Match-Budget im laufenden Jahr).
- **PayrollContribution** — ein einzelner Payroll-Beitrag eines Mitarbeiters + das automatisch
  berechnete Match; verlinkt die gematchte `Donation` (an die Schule) und den `LedgerEntry`.

## Success Criteria

- Ein Sponsor kann ein HRIS (Mock-ADP) mit read-only Scopes verbinden; ein Write-Scope wird abgelehnt.
- Ein Sync zieht Mitarbeiter über den `EmployeeDataProvider` und legt `EmployeePayrollProfile`s an.
- Eine Payroll-Giving-Campaign berechnet für jeden aktivierten Mitarbeiter das E13-Match,
  bucht die gematchte Donation auf die Schul-Kampagne und schreibt einen Ledger-`DISBURSEMENT`-
  bzw. `DONATION`-Trail — bestätigt: Geld an die Schule, nie an den Mitarbeiter/Studierenden.
- Der Per-Mitarbeiter-Cap wird respektiert (Match wird gedeckelt).
- Der Compliance-Trail listet Verbindung, Sync und Campaign lückenlos.
- Alle neuen reinen Logik-Dateien halten das Per-Path-80%-Gate; beide Builds und der Seed sind grün.

## Out of Scope (ehrlich)

- **Kein echtes HRIS/OAuth.** Es gibt **keine** echten ADP/Workday/Paychex-OAuth-Redirects
  oder API-Calls. Der `MockEmployeeDataProvider` liefert deterministische Sample-Mitarbeiter;
  die ADP/Workday-Skeletons kompilieren, werfen aber `not configured` und werden in Tests nie
  ausgeführt.
- **Kein echter Payroll-Write-Back.** Das Payroll-Deduction-Line-Item wird nur berechnet und
  als Mock-Referenz emittiert — es wird nichts in einem echten Lohnabrechnungssystem gebucht.
- **Kein SSO/SCIM.** Employee-SSO-Login (SAML/OIDC) und SCIM-Provisioning sind nicht implementiert;
  Mitarbeiter werden über den Sync als Sample-Daten angelegt.
- **Matching baut auf E13.** Die Match-Betrag-/Balance-Berechnung wird nicht neu gebaut; E21
  ergänzt nur die firmenweite Regel + Per-Mitarbeiter-Cap-Tracking darüber.
- **Setup-Fee/Billing nicht implementiert.** Der Revenue-Stream (Setup-Fee) ist Produkt-Kontext,
  nicht Teil des Prototyps — keine Rechnung, kein Payment für die Kopplung selbst.
- **Single-Instance.** Per-Instance-State (kein verteiltes Locking); der Sync ist synchron und
  idempotent im Prototyp, keine Queue/Retry-Infrastruktur.
- **Compliance-Trail = Prototyp-Audit-Log.** Der Trail nutzt den E6-`AuditService` (Postgres-
  Append-Log). Er ist kein zertifiziertes Compliance-System (SOC2/ISO), sondern ein nachweisbarer
  Prototyp-Trail.
- **Keine echte Tax-Bracket-Engine.** Pre-Tax wird als einfacher Prozent-Abschlag modelliert,
  nicht als echte Lohnsteuer-Berechnung.
