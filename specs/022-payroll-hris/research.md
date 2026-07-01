# Research & Clarify — Feature 022 Payroll-Match & HRIS-Kopplung (E21)

Offene Punkte vor dem Bau, entschieden entlang der Constitution und der bestehenden Infra.

## Entscheidung 1 — Payroll ist Donor-Finanzierung, kein neuer Payout-Pfad

**Frage:** Ändert Payroll-Giving den Money-Flow? **Antwort:** Nein. Payroll-Giving beschreibt nur,
**woher** das Geld des Spenders/Arbeitgebers kommt (vom Gehalt / vom Firmen-Match-Budget). Die
gematchte Spende ist eine ganz normale `CORPORATE`-Donation auf die Schul-Kampagne und wird über
den bestehenden E2-`PaymentProvider` / E12-Ledger an die **SCHULE** ausgezahlt. Kein Mitarbeiter-
Wallet, keine Auszahlung an einen Studierenden (Constitution II).

## Entscheidung 2 — Matching wird aus E13 wiederverwendet, nicht neu gebaut

**Frage:** Braucht E21 eine eigene Match-Engine? **Antwort:** Nein. `computeMatch(donationCents,
matchRatio, remainingCents)` und `remainingAnnualCents(cap, used)` aus `matching/match-amount.ts`
sind bereits rein, integer-safe und getestet (nie negativ, nie über Cap). E21 importiert sie direkt.
Die firmenweite `PayrollMatchRule` liefert nur Ratio + Per-Mitarbeiter-Cap in die E13-Funktion.
`match-rule.ts` ist ein dünner Adapter darum, keine zweite Rechnung.

## Entscheidung 3 — `EmployeeDataProvider`-Seam in der PaymentProvider-Linie

**Frage:** Wie werden ADP/Workday/Paychex angebunden, ohne echte Calls? **Antwort:** Ein einziger
`EmployeeDataProvider`-Seam (Symbol-DI `EMPLOYEE_DATA_PROVIDER`), Default `MockEmployeeDataProvider`
mit deterministischen Sample-Mitarbeitern. Real-Skeletons (`AdpEmployeeDataProvider`,
`WorkdayEmployeeDataProvider`) kompilieren, werfen aber `not configured` ohne Credentials. Die
env-gated Factory `createEmployeeDataProvider` spiegelt exakt `createPaymentProvider` /
`createEmployerMatchProvider`: Default mock, real nur bei Flag + Key, Fallback auf mock.
**Kein OAuth-Redirect, kein API-Call im Prototyp.**

## Entscheidung 4 — OAuth2-Scopes werden read-only erzwungen (rein)

**Frage:** Wie garantieren wir, dass Bursa niemals Gehälter schreiben kann? **Antwort:** Beim
Connect wird der angeforderte Scope-Satz rein validiert (`oauth-scope-validator.ts`): enthält er
einen Write-/Payroll-Write-/Update-/Admin-Scope, wird `INVALID_SCOPES` geworfen. Nur read-only
Scopes (z.B. `employees.read`, `payroll.read`) sind erlaubt. Das ist eine reine Funktion mit
80%-Gate — kein echter OAuth-Server nötig.

## Entscheidung 5 — Per-Mitarbeiter-Jahres-Cap, integer minor units

**Frage:** Wie wird das Match-Budget getrackt? **Antwort:** Wie E13 auf User-Ebene, hier auf
`EmployeePayrollProfile`-Ebene: `matchYear` + `matchUsedCents`. Ein Match, das über den Per-
Mitarbeiter-Cap ginge, wird von der E13-`computeMatch` gedeckelt (`capped=true`). Alles integer
cents, keine Floats auf dem Geld-Pfad.

## Entscheidung 6 — Payroll-Cycle-Scheduler als reine Entscheidung

**Frage:** Wann ist eine Deduction fällig? **Antwort:** Aus dem `PayrollCycle` (WEEKLY/BIWEEKLY/
SEMIMONTHLY/MONTHLY) und einem injizierten `now` wird rein entschieden, ob die aktuelle Periode
eine Deduction auslöst + wann die nächste fällig ist (`payroll-cycle.ts`). `now` wird injiziert —
kein `Date.now()` in der reinen Logik, deterministische Tests.

## Entscheidung 7 — Pre-Tax = einfacher Prozent-Abschlag (kein Lohnsteuer-Modell)

**Frage:** Wie modellieren wir Pre-Tax-Giving? **Antwort:** Als einfacher, minor-unit-sicherer
Prozent-Abschlag in `payroll-deduction.ts` (z.B. 25% Steuervorteil → effektive Deduction kleiner).
Eine echte Lohnsteuer-Engine ist bewusst Out-of-Scope; der Prototyp zeigt nur die Mechanik.

## Entscheidung 8 — Compliance-Trail über den E6-AuditService

**Frage:** Bauen wir ein eigenes Compliance-Log? **Antwort:** Nein. Jede Connection, jeder Sync und
jede Campaign schreibt über den E6-`AuditService` (`payroll.hris.connect`, `payroll.hris.sync`,
`payroll.campaign.run`) — PII-redigiert, bricht nie den Business-Flow. Der Trail ist read-only über
`GET /payroll/trail` abrufbar. Kein zertifiziertes Compliance-System, ein nachweisbarer Prototyp-Trail.

## Entscheidung 9 — HRIS-Sync-Webhook über den E6-Signatur-Guard

**Frage:** Wie sichern wir HRIS-Statusmeldungen? **Antwort:** `HrisWebhookGuard` nutzt exakt das
E6-`verifyWebhookSignature`-Schema (HMAC-SHA256 über `${timestamp}.${rawBody}`, timing-safe, Replay-
Fenster), nur mit eigenem Header (`x-hris-signature`) und Secret (`HRIS_WEBHOOK_SECRET`). Fail-closed
mit 400 `INVALID_SIGNATURE`. Kein neuer Krypto-Code.

## Entscheidung 10 — Modul-Schnitt: eigenes `payroll`-Modul

**Frage:** Gehört das in `corporate/` oder `matching/`? **Antwort:** Eigenes `payroll/`-Modul (hohe
Kohäsion, geringe Kopplung, Constitution IV). Es **importiert** E13 (`match-amount.ts`), E5-Relation
(`CorporateProfile`), E6 (`AuditService`, Signatur), E2/E12 (`PaymentProvider`, `LedgerService`),
baut sie aber nicht um. So bleibt der Payroll-/HRIS-Layer klar getrennt und einzeln testbar.
