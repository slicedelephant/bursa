# Research 013 — Payout-Reconciliation & Transparenz-Layer (E12)

## Ausgangslage

E1-E11 sind gebaut und gemerged. E12 setzt auf:

- **E2 Payments / All-or-Nothing** — `PaymentProvider`-Naht, `Payout`-/`Donation`-
  Datensätze (Pledge → Capture → Payout). Die Reconciliation liest diese Datensätze;
  der Geld-Pfad wird nicht angefasst.
- **E5 Corporate Channel** — der dependency-freie **`buildSimplePdf`**-Writer
  (`corporate/pdf.util.ts`) und die **CSV-Muster** (`corporate/esg.util.ts`,
  RFC-4180-ish `cell()`). Beides wird für die E12-Exporte wiederverwendet, keine neue
  Export-Infrastruktur.
- **E8 School Portal** — `SchoolPortalService` + `school-dashboard.ts` (Totals,
  Per-Studierenden-Payout-Status, Spender-Geografie über `Donation.donorCountry`), das
  `payout-status.ts`-Primitive, und `Donation`-Status-Set (`SUCCEEDED`/`CAPTURED`/
  `PLEDGED`). Das Dashboard wird **erweitert**, nicht geforkt.
- **E6 Security Hardening** — `AuditService` (append-only Audit-Log) als Vorbild für
  die "schreibt-und-liest-nie-mutiert"-Disziplin; das Ledger ist eine eigene, strengere
  Variante (kein Soft-Delete, Hash-Chain, fachliches Money-Primitive).

## Inspirationsquellen (Konkurrenz)

| Anbieter | Was wir übernehmen | Was wir bewusst NICHT bauen |
|---|---|---|
| Stripe | Payout-Reconciliation-Report (matched/unmatched/pending), Balance-Transactions als Ledger | echter NetSuite-Connector, Live-Payout-API |
| Open Collective | Transaction-Transparency (öffentliche Aggregate), Bulk-CSV-Export, Double-Entry-Buchhaltung | echte Fiscal-Host-Buchhaltung, Live-Ledger-Sync |
| Plaid | Bank-Feed-API (Transaktionen je Konto, idempotente `transaction_id`) | echter Plaid-Link-/OAuth-Flow, Live-Bank-Anbindung |
| QuickBooks / Wave / NetSuite | Double-Entry-Export (Debit/Credit, GL-Codes) | echter API-Push in die Buchhaltungs-Software |

Gemeinsamer Nenner: alle stützen sich auf ein **append-only Ledger** und matchen
System-Bewegungen gegen einen externen Bank-Feed; die Reconciliation ist eine reine
Funktion (Beträge + Referenzen + Datums-Fenster), die externe Seite sitzt hinter einer
austauschbaren Schnittstelle.

## Entscheidung 1 — Bank-Feed-Abstraktion exakt wie PaymentProvider

`payment-provider.interface.ts` definiert ein Interface + ein `Symbol`-Token; die Factory
(`payment-provider.factory.ts`) wählt anhand eines Env-Flags zwischen Mock und echtem
Provider und fällt bei Fehlern auf Mock zurück. Das Modul bindet das Token via
`useFactory`.

**Übernommen:** ein neuer Seam.

- `BankFeedProvider` (`fetchTransactions(schoolId, since)`) + `BANK_FEED_PROVIDER`-Token.
  Mock: `MockBankFeedProvider` (deterministisch — leitet Bank-Transaktionen aus den
  System-Payouts ab, mit gezielten Sentinels für unmatched/discrepancy/stale).
  Skeleton: `PlaidBankFeedProvider` (`fetch` → Plaid `/transactions/get`, lazy, gated,
  nie im Test). Factory: `BANK_FEED_PROVIDER=mock|plaid` (Default `mock`), Key
  `PLAID_SECRET` (+ optional `PLAID_CLIENT_ID`).

Der Skeleton ruft die API über `fetch` (kein SDK-Dependency, wie der Stripe-/Claude-/
Sumsub-Provider), wirft im Konstruktor ohne Key, und wird in Tests nie ausgeführt.

## Entscheidung 2 — Ledger als wiederverwendbares append-only Primitive (für E14)

Das Ledger ist **kein** Reconciliation-Detail, sondern ein eigenständiges Domänen-
Primitive in `apps/api/src/ledger/`:

- `ledger-entry.ts` (pur) — Builder, der aus einer Bewegung (Typ, Betrag, Schule,
  Akteur, Grund, Referenz, Sequence, prevHash) einen kanonischen Eintrag + dessen
  `entryHash` formt. Immutabel, deterministisch.
- `ledger-hash.ts` (pur) — SHA-256 über eine **kanonische, stabil sortierte**
  Feld-Serialisierung (Node `crypto`, kein I/O) + `verifyChain()` über eine Eintrags-
  Liste (prevHash-Verkettung + Hash-Neuberechnung). Reine Integritäts-Logik.
- `ledger.service.ts` — dünn: bietet **nur** `append(entry)` (innerhalb einer
  Transaktion: letzten Eintrag der Schule lesen → Sequence/prevHash bestimmen → Eintrag
  schreiben) und `read`-Methoden (`listForSchool`, `verifyIntegrity`). **Es gibt keine
  `update`/`delete`-Methode** — das ist die durchgesetzte Append-only-Invariante
  (Constitution IV). E14 kann CSRD-Reporting über `listForSchool`/`verifyIntegrity`
  legen, ohne das Ledger zu verändern.

Begründung gegen Wiederverwendung des E6-`AuditLog`: das Audit-Log ist ein
PII-redigiertes Zugriffs-/Sicherheits-Protokoll (kein Geld-Primitive, keine Hash-Chain,
kein Sequence-/Betrags-Modell). Ein Geld-Ledger braucht ein eigenes, fachlich typisiertes
Modell mit Integritäts-Verkettung. Das Ledger ergänzt das Audit-Log, ersetzt es nicht.

## Entscheidung 3 — Reconciliation rein, Provider dünn

Wie E5/E9/E11 bleibt jede Entscheidung pur und ohne I/O (Per-Path-80%-Gate):

- `reconciliation-matcher.ts` — matcht eine Liste System-Payouts gegen eine Liste
  Bank-Transaktionen. Match = gleiche `reference` ODER (gleicher Betrag + gleiches
  `schoolId` + `postedAt` innerhalb eines Datums-Fensters). Ergebnis je Payout: `MATCHED`
  (Bank-Tx gefunden), `PENDING` (Payout SENT, noch innerhalb 48h, keine Bank-Tx),
  `UNMATCHED` (Payout SENT, > 48h, keine Bank-Tx). Übrige Bank-Tx ohne Payout → eigene
  `unmatchedBankTx`-Liste.
- `discrepancy-detector.ts` — flaggt Betrags-Abweichung (Payout-Betrag != Bank-Betrag)
  und System-ohne-Bank (DISCREPANCY) bzw. Bank-ohne-System (ORPHAN_BANK_TX).
- `stale-payout-alert.ts` — reine 48h-Entscheidung: Payout SENT + `sentAt` älter als
  `STALE_AFTER_HOURS=48` + kein Match → Alert.

## Entscheidung 4 — Exporte über die E5-Utils

- **CSV**: gleiche `cell()`-Escaping-Linie wie `esg.util.ts`; eigene Header je Export.
- **PDF**: `buildSimplePdf(title, lines)` aus `corporate/pdf.util.ts` direkt
  wiederverwendet (Import über relativen Pfad), keine zweite PDF-Implementierung.
- **Tax-Report** (`tax-report.ts`, pur): zwei Regimes. US → 1099-MISC-ähnliche Felder
  (Payer = Bursa, Recipient = School, Box-7/Box-3-Betrag). EU → SEPA-Doku (IBAN-maskiert,
  Mandats-/Referenz-Felder, BIC). Region wird aus `School.country` abgeleitet
  (EU-Länderliste → SEPA, sonst US/1099). Output ist ein strukturiertes, exportierbares
  Objekt (→ CSV/PDF), kein zertifiziertes Formular.
- **Double-Entry** (`double-entry.ts`, pur): je Auszahlung zwei Buchungszeilen — Debit
  auf das GL-Konto "Tuition Disbursements" (z. B. `5000`), Credit auf "Bank/Clearing"
  (z. B. `1000`). Summe Debit == Summe Credit (balanciert). Format für
  QuickBooks/Wave/NetSuite-Import (Journal-Entry-CSV).

## Entscheidung 5 — Public Transparency ohne PII

`transparency-aggregator.ts` (pur) aggregiert pro Schule: `totalRaisedCents`,
`totalPaidOutCents`, `donationCount`, `avgDonationCents`, `studentsSupported`,
`donorGeography` (Land → Count + Summe). **Keine** einzelnen Spender, keine Namen, keine
IDs — nur Aggregate. Der Endpunkt ist öffentlich (kein Auth-Guard), liefert aber nur
diese Aggregate, sodass eine Schul-Website sie einbetten kann (Open-Collective-Linie).

## Entscheidung 6 — Schwellen/Konstanten als benannte Werte

- `STALE_AFTER_HOURS = 48` (Reconciliation-Alert).
- `MATCH_DATE_WINDOW_HOURS = 72` (Datums-Fenster für den Betrags-Match).
- GL-Codes: `GL_DISBURSEMENT_DEBIT = '5000'`, `GL_BANK_CREDIT = '1000'`.
- EU-Länderliste für die SEPA/US-Regime-Ableitung (statische Liste, illustrativ).

Keine Hardcoded-Magic-Numbers im Service; alle Schwellen leben benannt in den puren Cores.

## Entscheidung 7 — deterministische Mock-Bank-Feed-Sentinels (demobar)

Der `MockBankFeedProvider` leitet Bank-Transaktionen deterministisch aus den
System-Payouts der Schule ab:

- Default: für jeden Payout (SENT/CONFIRMED) wird eine passende Bank-Tx mit gleicher
  Referenz + gleichem Betrag erzeugt → **MATCHED**.
- Ein Payout, dessen `reference` mit `-STALE` endet (Seed-Sentinel), bekommt **keine**
  Bank-Tx und ist > 48h alt → **UNMATCHED** + 48h-Alert.
- Ein Payout, dessen `reference` mit `-DISCREPANCY` endet, bekommt eine Bank-Tx mit
  **abweichendem Betrag** → Discrepancy-Flag.
- Zusätzlich eine "orphan" Bank-Tx ohne passenden Payout → ORPHAN_BANK_TX.

So sind matched, unmatched/stale, discrepancy und orphan ohne echten Provider demobar.

## Risiken / offene Punkte

- **Kein echter Bank-Feed/Plaid-Link:** strukturierte Mock-Transaktionen statt echter
  Bankdaten (Out-of-Scope, Folge-Epic).
- **Tax-Reports prototyp-grade:** illustrativ, nicht rechtlich zertifiziert (wie spec
  dokumentiert).
- **Synchron / Single-Instance:** kein Scheduler; der 48h-Alert wird bei Abruf berechnet.
- **Prisma migrate dev non-interaktiv** evtl. blockiert → Fallback via
  `migrate diff --script` + `migrate deploy` (siehe quickstart).
