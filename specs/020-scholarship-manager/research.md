# Research & Clarify — Feature 020 Scholarship Program Manager (E19)

## Entscheidung 1 — Award-Disbursement läuft über den E2/E12-Pfad an die Schule

**Entscheidung:** Ein `ScholarshipAward` wird nie an den Scholar ausgezahlt. Die
Auszahlung geht über `PaymentProvider.createPayout({ amountCents, currency, schoolName,
accountRef, description })` an die **verifizierte Schule** und wird als `LedgerEntry`
(`entryType: 'DISBURSEMENT'`) im append-only Ledger festgehalten.

**Begründung:** Constitution II ist bindend: "money is always disbursed to the school,
never to a student wallet". Der Auftrag ist explizit: "award disbursement goes through
the existing payout path to the SCHOOL … recorded in the append-only ledger. Conditional
payouts still pay the school." Es gibt bereits einen erprobten Pfad (`PayoutsService.
disburse` → `createPayout`), den wir als Vorbild nehmen, statt einen zweiten zu bauen.

**Konsequenz:** `ScholarshipAward` trägt `schoolId` (Ziel) + `payoutRef`/`ledgerRef`, aber
kein Feld, das an einen Scholar zahlen könnte. Ein Award ohne verifizierte Schule
(`payoutVerified = false`) wird an der Grenze abgelehnt (`DomainException('SCHOOL_NOT_
VERIFIED', …, 409)`).

## Entscheidung 2 — Schema-getriebenes Formular statt Drag-Drop-WYSIWYG

**Entscheidung:** Der Application-Builder ist eine konfigurierbare Feld-Liste
(`FormField[]` mit Typ, Pflicht, Optionen, Rubric-Gewicht, `showIf`-Conditional), kein
visuelles Drag-Drop-Layout-Tool.

**Begründung:** Der Auftrag nennt das explizit als Prototyp-Grenze ("a schema-driven form,
not a full drag-drop WYSIWYG — a pragmatic prototype"). Das Schema deckt Custom-Fields +
Conditional-Logic (die Business-Anforderung) ab, ohne einen Editor-Aufwand, der 80% der
Zeit fräße.

**Konsequenz:** Der Owner setzt das Schema über `PUT /programs/:id/form` mit einem
validierten JSON-Array. `validateFormSchema` ist der reine Wächter. Steht so im
"Out of Scope".

## Entscheidung 3 — Conditional-Logic + Answer-Validierung als reine, deterministische Kerne

**Entscheidung:** `evaluateVisibility(fields, answers)` liefert je Feld ein `boolean`
(sichtbar?) rein aus dem `showIf`-Regelwerk; `validateAnswers` prüft nur sichtbare
Pflichtfelder, Typen und SELECT-Werte. Beide sind reine Funktionen ohne I/O.

**Begründung:** Constitution IV (Immutability) + V (Boundary-Validierung). Rein testbar,
kein Netz, injizierbar. Der gleiche Sichtbarkeits-Kern wird im Frontend gespiegelt
(`apply-visibility.ts`), damit UI und Backend nicht driften (Linie E16: abgeleiteter State
driftet nicht).

**Konsequenz:** Ein Feld mit unerfülltem `showIf` ist ausgeblendet und wird nie als
Pflichtverletzung gewertet. Zirkuläre/kaputte `showIf`-Referenzen fängt schon
`validateFormSchema` beim Speichern ab.

## Entscheidung 4 — Rubric-Aggregation: gewichteter Konsens, auf 0–100 normalisiert

**Entscheidung:** `aggregateRubric({ fields, scores })` bildet je Rubric-Feld den
gewichteten Mittelwert der Reviewer-Scores (0–5) und daraus einen Konsens-Score der
Application, normalisiert auf 0–100. Felder mit Gewicht 0 zählen nicht.

**Begründung:** Konsens-Voting über mehrere Reviewer braucht ein deterministisches,
gewichtetes Verfahren. Normalisierung auf 0–100 macht das Ranking über Programme hinweg
vergleichbar und die Award-Decision einfach.

**Konsequenz:** Reviewer, die (noch) nicht gescort haben, zählen nicht in den Mittelwert
(kein Null-Bias). Der Aggregator ist rein; die Persistenz der Scores liegt im Service.

## Entscheidung 5 — Award-Decision: Ranking mit Budget-/Slot-Cutoff, deterministische Ties

**Entscheidung:** `decideAwards({ ranked, budgetCents, slots, awardCents })` sortiert
Applications nach Konsens-Score absteigend, kürt Gewinner bis Budget **oder** Slots
erschöpft sind. Gleichstände werden deterministisch nach `appId` (lexikografisch)
aufgelöst.

**Begründung:** Reproduzierbarkeit (gleiche Eingabe → gleiche Gewinner) ist für einen
fairen Award-Prozess Pflicht. Zwei Grenzen (Budget in Cents + Slot-Anzahl) decken beide
realen Modelle ab ("wir haben X € / wir vergeben Y Plätze").

**Konsequenz:** Der Aufrufer setzt `awardCents` je Scholar (Fixbetrag im Prototyp).
Variable Beträge pro Scholar bleiben ein einfaches Feld am Award, nicht Teil des
Ranking-Kerns.

## Entscheidung 6 — Conditional-Tranche: reine GPA-Schwellwert-Entscheidung, zahlt wieder an die Schule

**Entscheidung:** `decideConditionalRelease({ gpa, threshold, alreadyReleased })` gibt
`RELEASE`, wenn `gpa >= threshold` und noch nicht freigegeben, sonst `HELD`. Bei `RELEASE`
läuft die Auszahlung erneut über `createPayout` **an die Schule** + Ledger-Append.

**Begründung:** Der Auftrag nennt "conditional payouts (e.g. semester 2 released on a GPA
threshold) still pay the school". Reine Schwellwert-Logik reicht für den Prototyp; ein
echter Registrar-Notenfeed ist Out-of-Scope.

**Konsequenz:** Das GPA-Feld ist manuell gepflegt (SRM). Kein Echtzeit-Notensystem.
Doppelte Freigabe ist ausgeschlossen (`alreadyReleased`-Guard).

## Entscheidung 7 — Scholar-Status als reine State-Machine

**Entscheidung:** `nextScholarStatus(current, event)` erlaubt nur definierte Übergänge:
`AWARDED --enroll--> ENROLLED --graduate--> GRADUATED --employ--> WORKING`, plus
`--withdraw--> WITHDRAWN` aus jedem nicht-terminalen Zustand. Ungültige Übergänge werfen.

**Begründung:** Constitution V (fail loud, Invarianten vor Mutation). Ein reiner Automat
ist trivial testbar und verhindert unmögliche SRM-Zustände. `now` injiziert für
Milestone-Zeitstempel.

**Konsequenz:** `GRADUATED`/`WORKING` sind für den Alumni-Flag relevant; `WITHDRAWN` ist
terminal. Die DB speichert nur den aktuellen Status + Milestone-Timestamps.

## Entscheidung 8 — Scholar-Verifizierung = E11 KYC (kein Neubau)

**Entscheidung:** Wird ein Scholar auf der Plattform geführt (User mit STUDENT-Rolle), so
läuft seine Verifizierung über `KycService.startCase(...)` — nicht über eine neue
E19-Pipeline.

**Begründung:** Der Auftrag: "award recipients (scholars) are verified via the existing
KYC pipeline; reuse it, don't re-verify from scratch." Doppelte Verifizierung wäre teuer
und inkonsistent.

**Konsequenz:** E19 speichert im `ScholarRelationship` optional eine `verificationCaseId`-
Referenz auf den bestehenden E11-Case, statt Verifikationslogik zu duplizieren. Die
Award-Auszahlung hängt an der **Schul**-Verifizierung (E8), nicht an einer neuen
Scholar-Verifizierung — Geld fließt ohnehin nur zur Schule.

## Entscheidung 9 — Impact-Report: E5-PDF/CSV + E14-Diversity, kein eigener Renderer

**Entscheidung:** Der Impact-Report komponiert Outcome-Zahlen (`buildProgramOutcome`) und
Diversity (`aggregateDiversity`, E14) und rendert über `buildSimplePdf` (E5) bzw. einen
`toCsv`-Stil (E5). Kein neuer PDF-/CSV-/Diversity-Kern.

**Begründung:** Der Auftrag: "diversity capture + outcome reporting: reuse the E14
diversity/CSRD reporting … PDF/CSV: reuse E5." Wiederverwendung hält die Reporting-Formate
konsistent und die Module fokussiert (Constitution IV).

**Konsequenz:** Diversity liest die optionalen `StudentProfile`-Felder (`gender`,
`birthYear`, `firstGen`, `country`). Fehlende Felder senken die Data-Quality, brechen aber
nichts (E14-Linie: nur non-null zählt zum Share).

## Entscheidung 10 — Modul-Schnitt: eigenes `scholarship`-Modul

**Entscheidung:** Neues Feature-Modul `apps/api/src/scholarship/` (analog `corporate`,
`esg`, `impact-feed`). Importiert `PaymentsModule`, `LedgerModule`, `KycModule`,
`SchoolsModule` und bindet den `MESSAGING_PROVIDER` per env-gegateter Factory (E17-Muster).
Zwei Controller: SPONSOR-gegateter `ScholarshipController` (Programm/Review/Award/SRM) und
öffentlicher, token-gegateter `ApplyController` (Bewerbung).

**Begründung:** Hohe Kohäsion, niedrige Kopplung (Constitution IV). Trennung von Corporate
(E5, das ist der B2B-Zahlungs-/ESG-Channel) hält beide Module fokussiert; E19 ist ein
Self-Serve-Programm-Konstrukt, kein Einzel-Sponsoring. Web: neue Feature-Area
`features/scholarship/` plus eine öffentliche `/apply/:token`-Route (Muster wie
`transparency/:schoolId`).

**Konsequenz:** `ScholarshipModule` wird in `app.module.ts` nach `GroupsModule`
registriert. Der Ledger wird nur read-appended, nie mutiert.
