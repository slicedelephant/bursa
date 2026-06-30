# Feature 013 — Payout-Reconciliation & Transparenz-Layer (E12)

## WHY

Eine Schule erhält heute ihre Auszahlung, aber niemand stimmt automatisch ab, ob
das Geld, das Bursa als "ausgezahlt" verbucht hat, auch wirklich auf dem
Schul-Bankkonto angekommen ist. Der CFO gleicht das manuell ab — fehleranfällig,
langsam, nicht skalierbar. Es gibt keinen Buchhaltungs-Export und keine Tax-Reports.
Damit bleibt die Trust-USP "das Geld geht direkt an die Schule" eine **Behauptung**
statt eines **Belegs**.

Stripe (Payout-Reconciliation-Report + API, NetSuite-Connector), Open Collective
(Transaction-Transparency, Bulk-Exports) und Plaid (Bank-Feed-APIs) zeigen, wie das
geht: Auszahlungen werden gegen einen Bank-Feed gematcht, Diskrepanzen werden
geflaggt, und jede Bewegung landet in einem unveränderlichen Ledger. Dieses Epic baut
genau das als **lauffähigen Prototyp-Ausschnitt** — und zwar so, dass der Bank-Feed
genau wie der `PaymentProvider` (Constitution III) hinter einer **austauschbaren
Schnittstelle** sitzt: der Prototyp liefert einen **deterministischen Mock**
(keine Netzaufrufe, läuft ohne Key), ein echter Plaid-Skeleton ist per Env-Flag
einschaltbar und kompiliert, wird aber im Test/Default-Lauf nie aufgerufen.

Das Herzstück ist ein **append-only Transaction-Ledger** als wiederverwendbares
Domänen-Primitive: jede geldbewegende Aktion (Spende, Auszahlung, Disbursement)
schreibt einen unveränderlichen Ledger-Eintrag. Kein Update, kein Delete. Dieses
Primitive wird E14 (CSRD-Audit-Trail) mitnutzen — es wird also bewusst als
**generische, append-only Basis** entworfen, nicht als Einmal-Lösung.

Das Epic verlässt sich bewusst auf die bestehende Infrastruktur und baut **nichts
neu**, was es schon gibt:

- Die Reconciliation liest die bestehenden **E2-`Payout`-/`Donation`-Datensätze**;
  der geprüfte Geld-Pfad (Pledge → Capture → Payout) wird nicht angefasst.
- Das **E8-Schul-Dashboard** wird um eine Reconciliation-Ansicht **erweitert**, nicht
  geforkt.
- Der dependency-freie **E5-PDF-Writer** und die **E5-CSV-Muster** werden für die
  Tax-/Payout-Exporte wiederverwendet — keine neue Export-Infrastruktur.
- Geld fließt weiterhin ausschließlich an die Schule, nie an den Studierenden
  (Constitution II).

## WHAT (Scope dieses Epics — gelieferter Kern)

- **Append-only Transaction-Ledger (das wiederverwendbare Primitive):** jede Spende,
  Auszahlung und jedes Disbursement schreibt einen unveränderlichen `LedgerEntry`
  (Zeitstempel, Akteur, Betrag, Empfänger = Schule, Grund, Hash-Chain). Ein dünner
  `LedgerService`, der **nur appended und liest** (kein Update/Delete) — so kann E14
  CSRD-Reporting darüber legen. Der pure `ledger-entry.ts`-Builder + ein
  `ledger-hash.ts`-Integritäts-Helfer (Hash-Chain über den Vorgänger-Eintrag) sind
  getestete reine Logik.
- **Automatische Payout-Reconciliation:** ein (Mock-)Plaid-Bank-Feed-Provider liefert
  Bank-Transaktionen; der pure `reconciliation-matcher.ts` matcht System-Payouts gegen
  Bank-Transaktionen (Betrag + Referenz + Datums-Fenster) → matched / unmatched /
  pending; der pure `discrepancy-detector.ts` flaggt Abweichungen (Betrags-Differenz,
  fehlende Gegenbuchung).
- **Schul-Dashboard (E8-Erweiterung):** Auszahlungs-History mit Status
  (pending → sent → confirmed), gematchte Bank-Transaktionen, Discrepancy-Flags.
- **Exporte:** CSV- + PDF-Auszahlungs-Liste; Tax-Report (1099-Format US / SEPA-Doku EU,
  purer `tax-report.ts`-Formatter); Double-Entry-Buchhaltungs-Export
  (QuickBooks/Wave/NetSuite — Debit/Credit-Paare, GL-Codes, purer
  `double-entry.ts`-Mapper).
- **Public Transparency API:** aggregierte Funding-Statistiken pro Schule (total raised,
  total paid out, avg donation, Spender-Geografie) für Schul-Websites — öffentlich, pur
  aggregiert (`transparency-aggregator.ts`).
- **Reconciliation-Alerts:** der pure `stale-payout-alert.ts` flaggt automatisch, wenn
  eine Auszahlung im System existiert, aber nach 48h nicht im Bank-Feed auftaucht.

## CRITICAL DESIGN — Bank-Feed hinter austauschbarer Schnittstelle + wiederverwendbares Ledger

- **`BankFeedProvider`** mit einem Symbol-Token (`BANK_FEED_PROVIDER`) — exakt im
  Muster von `PAYMENT_PROVIDER`. **`MockBankFeedProvider`** (deterministisch, kein Netz)
  für Prototyp UND alle Tests; echtes **`PlaidBankFeedProvider`**-Skeleton (`fetch`,
  nie im Test ausgeführt), gewählt durch die pure `bank-feed.factory.ts`, gated über
  `BANK_FEED_PROVIDER=mock|plaid` (Default `mock`), Key `PLAID_SECRET`.
- Das **append-only Ledger** ist ein erstklassiges Domänen-Primitive in
  `apps/api/src/ledger/`: ein dünner Service, der **ausschließlich** `append` und `read`
  kann (keine Update-/Delete-Methode existiert) — damit E14 CSRD-Reporting darüber legen
  kann. Der `ledger-entry.ts`-Builder und der `ledger-hash.ts`-Integritäts-Helfer sind
  reine, getestete Logik.
- **Reine Logik** (jeweils `.spec.ts` + 80%-Per-Path-Gate in `apps/api/package.json`):
  `ledger-entry.ts` (Builder), `ledger-hash.ts` (Hash-Chain/Integrität),
  `reconciliation-matcher.ts` (Match-Algorithmus), `discrepancy-detector.ts`,
  `tax-report.ts` (US 1099 / EU SEPA), `double-entry.ts` (GL-Mapper),
  `transparency-aggregator.ts`, `stale-payout-alert.ts` (48h-Entscheidung). Provider-
  Calls bleiben dünn; alle testbare Logik ist pur.

## User Stories

- **US1 (School-CFO):** Als School-CFO will ich mein Bankkonto verlinken und einen
  Auto-Reconciliation-Report sehen (matched / unmatched / pending), damit ich nicht
  manuell abstimme. (P1)
- **US2 (School-Accountant):** Als School-Accountant will ich einen CSV-/PDF-Export der
  Auszahlungen plus Tax-Details und einen Double-Entry-Export (Debit/Credit, GL-Codes),
  damit ich sie in unsere ERP/Buchhaltung einspielen kann. (P1)
- **US3 (School-Fundraising-Director):** Als Fundraising-Director will ich eine
  öffentliche Transparency-URL teilen, damit Spender sehen, dass alles direkt in die
  Studiengebühren geht. (P1)
- **US4 (Plattform-Operator/Owner):** Als Betreiber will ich, dass jede geldbewegende
  Aktion in einem unveränderlichen Ledger landet und eine im System ausgezahlte, aber
  nach 48h nicht im Bank-Feed auftauchende Auszahlung automatisch geflaggt wird, damit
  ich Diskrepanzen früh sehe. (P1)
- **US5 (Compliance / E14-Vorbereitung):** Als Compliance-Verantwortlicher will ich,
  dass das Ledger append-only ist (kein Update/Delete) und über eine Hash-Chain
  manipulationssicher verkettet ist, damit ein späteres CSRD-Audit (E14) darauf
  aufsetzen kann. (P2)

## Key Entities

- **LedgerEntry** (neu) — der unveränderliche Ledger-Eintrag. `entryType`
  (DONATION / PAYOUT / DISBURSEMENT), `amountCents`, `currency`, weiche
  `actorUserId`-Referenz, `schoolId` (Empfänger), `reason`, `refType`/`refId`
  (z. B. Payout-/Donation-Bezug), `sequence` (monoton), `prevHash` + `entryHash`
  (Hash-Chain), `createdAt`. **Kein** `updatedAt`, kein Soft-Delete — append-only.
- **BankTransaction** (neu) — eine vom Bank-Feed gelieferte Transaktion. `provider`,
  `externalId` (idempotent), `schoolId`, `amountCents`, `currency`, `reference`,
  `postedAt`, `raw` (Json). Wird gegen Payouts gematcht.
- **Reconciliation** (neu) — ein Reconciliation-Lauf je Schule. `schoolId`, `status`
  (matched / unmatched / pending / discrepancy zusammengefasst), Zähler
  (`matchedCount` / `unmatchedCount` / `pendingCount` / `discrepancyCount`),
  `runAt`. Die Detail-Rows werden zur Laufzeit berechnet (pur), nicht persistiert.
- **Payout** (bestehend, E2) — wiederverwendet als System-Seite der Reconciliation;
  neue Status-Semantik (PENDING → SENT → CONFIRMED) bleibt wie E2/E8. Keine Änderung
  am Geld-Pfad. Neue Rück-Relation auf `BankTransaction` (optionaler Match).
- **Donation** (bestehend, E2) — wiederverwendet als Quelle für Ledger-DONATION-Einträge
  und die Transparency-Aggregation. Keine neuen Money-Felder.
- **School** (bestehend, E8) — Empfänger im Ledger + Anker der Reconciliation/Transparency.

## Success Criteria

- Jede Auszahlung/Disbursement und jede gecapturte Spende schreibt **genau einen**
  unveränderlichen `LedgerEntry`; der `LedgerService` bietet **keine** Update-/Delete-
  Methode (append-only erzwungen). Die Hash-Chain verkettet jeden Eintrag mit seinem
  Vorgänger (`prevHash` = `entryHash` des vorherigen), pur und voll testbar.
- Bei `BANK_FEED_PROVIDER=mock` (Default) liefert der Bank-Feed deterministische
  Transaktionen ohne jeden Netzaufruf; der `reconciliation-matcher` matcht Payouts gegen
  Bank-Transaktionen und liefert reproduzierbar matched / unmatched / pending.
- Der `discrepancy-detector` flaggt eine Betrags-Abweichung bzw. eine im System
  vorhandene, aber im Bank-Feed fehlende Auszahlung deterministisch.
- Das E8-Schul-Dashboard zeigt die Reconciliation-Tabelle (matched/unmatched/pending +
  Discrepancy-Flags) und die Auszahlungs-History.
- CSV-, PDF-, Tax- (US 1099 / EU SEPA) und Double-Entry-Export (Debit/Credit + GL-Codes)
  werden deterministisch erzeugt; der Double-Entry-Export ist je Buchung balanciert
  (Summe Debit == Summe Credit).
- Die Public-Transparency-API liefert ohne Auth aggregierte Schul-Statistiken
  (total raised, total paid out, avg donation, Spender-Geografie); es werden **keine**
  personenbezogenen Spender-Daten preisgegeben (nur Aggregate).
- Der `stale-payout-alert` flaggt eine Auszahlung, die nach 48h nicht im Bank-Feed ist.
- Alle Tests grün, >=80% Coverage auf neuem Code (Per-Path-Gates), beide Builds grün,
  Prisma-Migration committet, Seed läuft (inkl. Ledger-Einträgen, einer gematchten +
  einer unmatched Bank-Transaktion und einem 48h-stale-Alert).
- `{success,data}`-Envelope, Boundary-Validation und Immutabilität bleiben gewahrt; der
  geprüfte Geld-Pfad wird nicht angefasst. Geld weiterhin nur an die Schule.

## Out of Scope (ehrliche Abgrenzung)

- **Kein** echter Bank-Feed-Call im Default-Lauf und in den Tests. Der Prototyp liefert
  einen **deterministischen Mock** (`MockBankFeedProvider`); der echte
  `PlaidBankFeedProvider` ist ein einschaltbares Skeleton (env-gated), wird in den Tests
  **nicht** ausgeführt, muss aber kompilieren — exakt die Linie von
  `MockPaymentProvider` / `StripePaymentProvider`.
- **Kein** echter Push zu QuickBooks/Wave/NetSuite und **kein** echter Plaid-Link-Flow.
  Die Buchhaltungs-/Tax-Exporte sind **Prototyp-Format** (Debit/Credit-Zeilen,
  GL-Codes, 1099-/SEPA-Felder) als Datei zum Import — **keine** rechtlich zertifizierten
  Steuer-Dokumente und keine API-Integration in eine echte Buchhaltungs-Software.
- **Keine** rechtlich verbindlichen Tax-Reports. Der 1099-/SEPA-Output ist eine
  illustrative, prototyp-taugliche Repräsentation, kein vom Finanzamt/IRS akzeptiertes
  Formular und keine Steuerberatung.
- **Kein** echtes Bankkonto-Linking / kein Plaid-OAuth. Das "Bankkonto verlinken" ist im
  Prototyp ein gemockter Schritt; die Bank-Transaktionen kommen aus dem deterministischen
  Mock-Feed.
- **Kein** Multi-Instanz-/Scheduler-/Worker-Setup. Reconciliation läuft synchron auf
  Abruf in einer Instanz; ein periodischer Cron/Job-Runner ist nicht Teil dieses Epics
  (der 48h-Alert wird bei Abruf berechnet, nicht von einem Hintergrund-Job gepusht).
- **Keine** Krypto-starke Manipulationssicherheit. Die Hash-Chain ist ein SHA-256 über
  die Eintragsfelder (Integritäts-Verkettung), kein signiertes/notarisiertes Ledger und
  keine Blockchain.
