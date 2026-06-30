# Feature 012 — Automated KYC & Verification Pipeline (E11)

## WHY

Heute lädt ein Studierender ein Diplom hoch, und ein Mensch gleicht es manuell mit
dem Schul-Datensatz ab. Das ist langsam, fehleranfällig und skaliert nicht: ab etwa
100 Studierenden pro Monat bricht der manuelle Prozess. Für Spender und Firmen-Sponsoren
gibt es gar keine Betrugs- oder Geldwäsche-Prüfung. Ohne automatisiertes KYC ist Bursa
weder FATF/AML-konform noch wachstumsfähig.

Persona, Onfido, Sumsub und Plaid zeigen, wie das geht: Liveness-Check (Video-Selfie),
Dokument-OCR, Namensabgleich und AML-Screening in 190+ Ländern. Dieses Epic baut die
gleiche Pipeline als **lauffähigen Prototyp-Ausschnitt** — und zwar so, dass jeder
externe Anbieter (Identitäts-/AML-Provider) genau wie der `PaymentProvider`
(Constitution III) hinter einer **austauschbaren Schnittstelle** sitzt: der Prototyp
liefert **deterministische Mocks** (keine Netzwerkaufrufe, laufen ohne Key), echte
Skeletons (Persona/Onfido für Identität, Sumsub für AML) sind per Env-Flag einschaltbar
und kompilieren, werden aber im Test/Default-Lauf nie aufgerufen.

Das Epic verlässt sich bewusst auf die bestehende Infrastruktur und baut **nichts neu**,
was es schon gibt:

- Jede Verifikations-Entscheidung wird über das **E6 `AuditLog`** (wer / wann / Ergebnis /
  welche Daten) protokolliert — kein zweites Audit-System.
- Eine **VERIFIED-Admission aus dem E8 Schul-Portal** ist bereits der Go-Live-Anker; die
  Schule/Registrar dient hier als zusätzliche Verifikations-Quelle. Wir nutzen den
  bestehenden Registrar-Seam, statt ihn zu duplizieren.
- Geld fließt weiterhin ausschließlich an die Schule, nie an den Studierenden
  (Constitution II).

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Liveness-Check für Studierende:** ein Video-Selfie-Schritt hinter einem Mock-Identitäts-
  provider. Deterministisch, kein externer Call: der Mock bewertet das Ergebnis anhand eines
  reinen `liveness-result.ts`-Evaluators (Confidence-Schwelle, Sentinel für die Fehlerdemo).
- **Dokument-Verifikation:** Diplom-Upload mit OCR (Mock-OCR extrahiert Name / Schule /
  Abschluss aus einem strukturierten Payload), plus **Fuzzy-Namensabgleich** des extrahierten
  Namens gegen den E8-Admission-Datensatz (`name-match.ts`, Levenshtein-Ähnlichkeit).
- **AML-Screening für Firmen-Sponsoren** oberhalb einer Schwelle (Default `> 5.000 EUR/Monat`)
  hinter einem Mock-AML-Provider; blockiert OFAC/sanktionierte Länder über eine kleine
  **statische Liste** (reine `aml-decision.ts`-Entscheidung, kein Live-Sanktions-Feed).
- **Risk-Scoring für Studierende:** geografisches Risiko, optionaler Income-Verification-Schritt
  und Schul-Akkreditierungs-Check fließen in einen reinen `risk-score.ts`-Aggregator
  (0-100 + Risk-Band), exakt im Muster des E9-`fraud-score.ts`.
- **Registrar-/Webhook-Integration:** wenn verfügbar wird direkt gegen die Schule verifiziert
  (Wiederverwendung des E8-`RegistrarProvider`-Pfads), statt einen zweiten Registrar-Seam zu
  bauen.
- **Manual-Review-Queue als Fallback** für Ausnahmen (fehlgeschlagene Liveness, OCR/Namens-
  Mismatch, AML-Treffer). Ein Operator (ADMIN) entscheidet APPROVE/REJECT; jede Entscheidung
  wird auditiert.
- **Audit-Trail:** jede Verifikations-Entscheidung (Liveness, Dokument, AML, Risk, manueller
  Review) wird über das E6 `AuditLog` protokolliert.

## CRITICAL DESIGN — Provider hinter austauschbaren Schnittstellen (Constitution III)

- **`IdentityVerificationProvider`** (Liveness + Dokument-OCR) und **`AmlScreeningProvider`**,
  jeweils mit einem Symbol-Token — exakt im Muster von `PAYMENT_PROVIDER`.
- **Mock-Implementierungen** (deterministisch, kein Netz) für Prototyp UND alle Tests
  (`MockIdentityVerificationProvider`, `MockAmlScreeningProvider`) — gespiegelt von
  `MockPaymentProvider`.
- **Echte Skeletons** (`PersonaIdentityProvider`, `SumsubAmlProvider`), die kompilieren, aber
  in Tests nie aufgerufen werden — gewählt durch reine Factories (`identity-provider.factory.ts`,
  `aml-provider.factory.ts`), gated über `KYC_PROVIDER=mock|persona` und `AML_PROVIDER=mock|sumsub`,
  Default jeweils `mock`.
- **Reine Logik** (jeweils `.spec.ts` + 80%-Per-Path-Gate in `apps/api/package.json`): Fuzzy-
  Namensabgleich (`name-match.ts`), Risk-Scorer (`risk-score.ts`), AML-Entscheidung
  (`aml-decision.ts`), Verifikations-State-Machine (`verification-state.ts`), Liveness-Result-
  Evaluator (`liveness-result.ts`), OFAC/Country-Matcher (`sanctioned-country.ts`). Provider-Calls
  bleiben dünn; alle testbare Logik ist pur.

## User Stories

- **US1 (MBA-Studierende aus Pakistan):** Als Studierende will ich meine Identität per Video-
  Selfie und Diplom-Upload bestätigen, damit meine Kampagne ohne tagelange manuelle Prüfung
  live gehen kann. (P1)
- **US2 (Studierender mit Namens-Varianten):** Als Studierender, dessen Name auf dem Diplom
  leicht anders geschrieben ist als in der Admission-Liste, will ich, dass ein kleiner Schreib-
  unterschied automatisch toleriert wird, aber ein echter Mismatch in die manuelle Review geht. (P1)
- **US3 (Firmen-Sponsor):** Als Firmen-Sponsor mit einem Beitrag über 5.000 EUR will ich ein
  schnelles AML-Screening durchlaufen, damit Bursa sauber bleibt — und blockiert werden, wenn ich
  aus einem sanktionierten Land komme. (P1)
- **US4 (Plattform-Operator):** Als Operator will ich eine Review-Queue aller Ausnahmefälle
  (Liveness fehlgeschlagen, OCR-Mismatch, AML-Treffer) sehen und je Fall APPROVE/REJECT
  entscheiden, wobei jede Entscheidung auditiert wird. (P1)
- **US5 (Compliance/Operator):** Als Compliance-Verantwortlicher will ich, dass jede
  Verifikations-Entscheidung im bestehenden Audit-Log nachvollziehbar ist (wer, wann, Ergebnis,
  welche Daten), damit ein Audit jederzeit möglich ist. (P2)
- **US6 (Betreiber, Skalierung):** Als Betreiber will ich, dass die automatische Pipeline den
  Großteil der Fälle ohne Mensch klärt und nur Ausnahmen eskaliert, damit wir über 100
  Studierende/Monat skalieren. (P2)

## Key Entities

- **VerificationCase** (neu) — der zentrale Verifikations-Vorgang. `subjectType`
  (STUDENT / SPONSOR), weiche `subjectUserId`-Referenz, optional `admissionRecordId`-Bezug
  (E8), `status` (Verifikations-State-Machine), aggregierter `riskScore` + `riskLevel`,
  `decisionNote`, `reviewedById`/`reviewedAt`. Eine Zeile pro Vorgang.
- **LivenessResult** (neu) — Ergebnis des Liveness-Schritts: `provider`, `confidence`
  (0-100), `passed`, `reference`. Gehört zu genau einem `VerificationCase`.
- **DocumentVerification** (neu) — Ergebnis des Dokument-Schritts: `provider`, extrahierte
  Felder (`extractedName`, `extractedSchool`, `extractedDegree`), `nameMatchScore` (0-100),
  `matched`, `reference`. Gehört zu genau einem `VerificationCase`.
- **AmlScreening** (neu) — Ergebnis des AML-Schritts für Sponsoren: `provider`,
  `amountCents`, `country`, `decision` (CLEAR / HIT / BLOCKED), `reasons`, `reference`.
  Gehört zu genau einem `VerificationCase`.
- **ReviewQueueStatus** (neu, Enum) — Status der Manual-Review-Queue: `NOT_REQUIRED`,
  `PENDING`, `APPROVED`, `REJECTED`.
- **VerificationCaseStatus** (neu, Enum) — `STARTED`, `LIVENESS_PASSED`,
  `DOCUMENT_VERIFIED`, `AML_CLEARED`, `VERIFIED`, `MANUAL_REVIEW`, `REJECTED`.
- **AdmissionRecord** (bestehend, E8) — wiederverwendet als Namens-/Programm-Quelle für den
  Dokument-Abgleich; keine Änderung an seiner Verifikations-Semantik.
- **User** (bestehend) — Anker des Vorgangs (`verificationCases`-Relation). Keine neuen Money-
  Felder.

## Success Criteria

- Ein Studierender durchläuft Liveness → Dokument → (Risk) und erhält bei `KYC_PROVIDER=mock`
  (Default) ein deterministisches Ergebnis ohne jeden Netzwerkaufruf.
- Der Fuzzy-Namensabgleich toleriert kleine Schreibunterschiede (z. B. ein Tippfehler /
  Akzent) oberhalb einer Ähnlichkeitsschwelle, schickt aber einen echten Mismatch in die
  Manual-Review — pur und voll testbar.
- AML-Screening läuft nur oberhalb der Schwelle (Default `> 5.000 EUR`); ein sanktioniertes
  Land führt deterministisch zu `BLOCKED`, ein Treffer zu `HIT` (→ Manual-Review), sonst
  `CLEAR`. Die OFAC-Länderprüfung ist pur und nutzt eine statische Liste.
- Der Risk-Score aggregiert geografisches Risiko, Income-Verification und Schul-Akkreditierung
  deterministisch in 0-100 + Risk-Band; gleiche Eingabe → gleicher Score.
- Die Verifikations-State-Machine erlaubt nur definierte Übergänge; ein Ausnahmefall landet
  immer in der Manual-Review-Queue (`PENDING`), nie in einem stillen Erfolg.
- Jede Entscheidung (auto oder manuell) wird über das E6 `AuditLog` protokolliert
  (`kyc.*`-Actions, Akteur, Ziel-Case, Ergebnis-Metadaten, PII-redigiert).
- Wenn ein `admissionRecordId` gesetzt ist, kann der Dokument-Schritt zusätzlich gegen den
  E8-Registrar verifizieren (Wiederverwendung), statt einen zweiten Pfad zu bauen.
- Identität und AML sitzen hinter `IdentityVerificationProvider` / `AmlScreeningProvider`;
  Mock ist Default, Persona/Sumsub per Env-Flag einschaltbar und kompiliert, ohne in Test/
  Default je das Netz zu berühren.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds grün, Prisma-
  Migration committet, Seed läuft (inkl. synthetischer Verifikations-Fälle).
- `{success,data}`-Envelope, Boundary-Validation und Immutabilität bleiben gewahrt; der
  geprüfte Geld-Pfad wird nicht angefasst. Geld weiterhin nur an die Schule.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** echter Liveness-/OCR-/AML-Call im Default-Lauf und in den Tests. Der Prototyp liefert
  **deterministische Mocks** (`MockIdentityVerificationProvider`, `MockAmlScreeningProvider`);
  die echten `PersonaIdentityProvider` / `SumsubAmlProvider` sind einschaltbare Skeletons
  (Env-gated), werden in den Tests **nicht** ausgeführt, müssen aber kompilieren — exakt die
  Linie von `MockPaymentProvider` / `StripePaymentProvider`.
- **Kein** Live-Sanktions-Feed (OFAC/EU/UN). Die sanktionierte Länderliste ist eine kleine
  **statische** Liste (wiederverwendet/erweitert von E9), kein Echtzeit-Screening gegen
  Personen-Watchlists.
- **Kein** echtes biometrisches Modell und **keine** echte OCR-Engine. Liveness-Confidence und
  extrahierte Dokumentfelder kommen aus einem deterministischen Mock-Payload; der Namensabgleich
  ist eine pure Levenshtein-Ähnlichkeit, kein trainiertes ML-Modell.
- **Kein** Datei-Upload-/Storage-Subsystem. Der Prototyp nimmt ein strukturiertes Mock-Payload
  (vorgegebene OCR-/Liveness-Felder) statt einer echten Video-/Bild-Datei entgegen; ein echter
  Upload-Pfad (S3, Virenscan, Bildverarbeitung) ist ein Folge-Schritt.
- **Keine** echte Income-Verification-Anbindung (Bank/Plaid). Der Income-Schritt ist ein
  optionaler, deklarierter Eingabewert, der nur in den Risk-Score einfließt.
- **Kein** Multi-Instanz-/Worker-Setup. Die Pipeline läuft synchron in einer Instanz; eine
  asynchrone Queue/Retry-Infrastruktur ist nicht Teil dieses Epics.
- **Keine** automatische Live-Schaltung der Kampagne aus diesem Epic heraus. Das Epic liefert
  den Verifikations-Status; die Go-Live-Logik (E8) bleibt unangetastet. Geld weiterhin nur an
  die Schule.
