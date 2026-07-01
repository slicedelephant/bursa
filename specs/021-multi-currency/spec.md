# Feature 021 — Multi-Currency & lokale Zahlungsmethoden (E20)

**Epic:** E20 · **Größe:** XL · **Primär:** Developer/Owner · **Hängt ab von:** E2 (Payment-Engine), E12 (Ledger/Reconciliation) · **Welle C (Enterprise & Skalierung)**

## Warum (Problem)

Bursa kennt heute nur USD/EUR und Karte/SEPA. Lokale Spender in Afrika und Asien zahlen
aber nicht mit Kreditkarte — sie zahlen mit M-Pesa, Mobile Money, GCash, bKash oder per
lokaler Banküberweisung. Ohne lokale Methoden verlierst Du >60% der Spender-Base in genau
den Märkten, in denen die geförderten Studierenden herkommen. Gleichzeitig soll die Schule
in **ihrer** Landeswährung (KES, NGN, GHS, BDT, PHP, VND) bezahlt werden, damit kein
FX-Risiko und keine Wechselkurs-Reibung bei der Schule landet.

**Modell-Korrektur (harte Regel):** Die Auszahlung erfolgt in Landeswährung **an die
SCHULE, nie an Studierende** (Trust-USP + rechtlicher Schutzschild, Constitution II). Die
lokalen Zahlungsmethoden sind ausschließlich für die **Spender-Einzahlung** (Donor-Deposit).
Es gibt kein Studenten-Wallet, keine Auszahlung an einen Scholar — in keiner Währung.

**E20 baut die Geld-Infrastruktur NICHT neu.** Der Deposit läuft über einen zusätzlichen
`PaymentProvider`-artigen Seam (`LocalDepositProvider`, Mock by default) genau in der Linie
von E2. Der Payout an die Schule läuft über den bestehenden E2-`PaymentProvider.createPayout`
und wird als `LedgerEntry` (`DISBURSEMENT`) im append-only E12-Ledger festgehalten. Die
Schul-Zahlungsdaten hängen an E8 (`School`); die per-Land-KYC-Variation nutzt die E11-Pipeline;
die Local-Payment-Webhooks nutzen den E6-Webhook-Signatur-Guard. Neu ist nur die
Multi-Currency-/FX-/Local-Method-/Routing-Schicht darüber.

## User Stories

- Als **lokaler Spender in Nigeria** möchte ich mit Mobile Money (statt Kreditkarte)
  spenden, damit ich überhaupt an einer Kampagne teilnehmen kann.
- Als **lokaler Spender in Kenia** möchte ich die Kampagne in KES sehen und mit M-Pesa
  zahlen, damit Betrag und Methode zu meinem Alltag passen.
- Als **US-Corporate-Spender** möchte ich in USD zahlen, während die Schule in KES bezahlt
  wird — mit einem zum Spendenzeitpunkt **eingefrorenen Wechselkurs**, damit weder ich noch
  die Schule ein FX-Risiko trägt.
- Als **Bursa-Betreiber** möchte ich, dass die Auszahlung an die Schule wenn möglich
  **direkt auf ein lokales Bankkonto** geht und nur im Ausnahmefall auf einen
  internationalen Transfer zurückfällt.
- Als **Schul-Admin** möchte ich mein lokales Auszahlungskonto (Landeswährung, lokale
  Bank/Virtual-IBAN) hinterlegen, damit die Tuition in meiner Währung ankommt.
- Als **Spender in einem lokalen Markt** möchte ich die Donate-Seite in meiner Sprache
  (Swahili, Yoruba, Bengali, Tagalog) sehen, damit ich dem Ablauf vertraue.

## Scope (was wird gebaut)

- **Multi-Currency:** Kampagnen/Ziele können in einer Landeswährung angezeigt werden; der
  Schul-Payout kann in Landeswährung erfolgen. Minor-Unit-korrekt (KES/NGN/… haben 2
  Nachkommastellen wie EUR; das Modell trägt die `decimals` pro Währung, damit es später
  auch für 0-Dezimal-Währungen stimmt).
- **Lokale Zahlungsmethoden (Donor-Deposit):** M-Pesa, Mobile Money, lokale
  Banküberweisung, E-Wallets (GCash, bKash) hinter einem `LocalDepositProvider`-Seam.
  Default ist ein deterministischer `MockLocalDepositProvider` — keine echten Gateway-Calls.
- **FX-Handling:** Ein Mock-FX-Rate-Provider. Zahlt ein Spender in Währung A und wird die
  Schule in Währung B bezahlt, wird mit einem **zum Spendenzeitpunkt eingefrorenen Kurs**
  (`lockedRate`) konvertiert; die FX-Slippage (Differenz gebuchter vs. später gültiger
  Kurs) wird berechnet und getrackt. Alle Kern-Funktionen bekommen Kurse/`now` injiziert
  (kein `Date.now()` in reiner Logik, deterministische Tests).
- **Localization / i18n:** Lokalisierte Labels für einige Locales (en, sw, yo, bn, tl) für
  den Donate-Flow (Sample-Daten, keine Voll-Übersetzung). Anzeige lokaler Bank-Details /
  Virtual-IBAN pro Land (display-only, Format-Prüfung).
- **Payout-Routing an die SCHULE:** Reine Entscheidung `direct-to-local-bank` wenn Konto in
  passender Landeswährung/Land vorhanden, sonst `international` als Fallback (Mock-Routing).
- **Per-Land-KYC-Variation:** Wiederverwendung von E11 mit länderspezifischen
  Dokument-Anforderungen (z.B. BVN in Nigeria statt Passport).
- **Webhook-Integrationen für lokale Zahlungen:** Mock-Status-Update-Webhooks
  (`local-payment.webhook`) hinter dem E6-Signatur-Guard-Muster.

## Functional Requirements

- **FR-1 (Geld immer an die Schule):** Jeder Payout-Pfad, in jeder Währung, zielt auf die
  **verifizierte Schule** (`School.payoutVerified`), nie auf ein Studenten-Wallet. Der
  Payout läuft über den E2-`PaymentProvider.createPayout` und wird als E12-`LedgerEntry`
  (`DISBURSEMENT`) festgehalten (Constitution II + IV).
- **FR-2 (Currency-Registry):** Unterstützte Währungen sind eine reine, deterministische
  Registry (`code`, `decimals`, `symbol`, `name`). Unbekannte Codes werfen an der Grenze.
- **FR-3 (Locked-Rate-Konvertierung):** `convertMinorUnits` konvertiert einen Minor-Unit-
  Betrag von Währung A nach B mit einem gegebenen `lockedRate` und den `decimals` beider
  Währungen. Integer-Rundung (round-half-up), niemals Floats für gespeichertes Geld;
  gleiche Währung ist ein Identitäts-No-Op. Rein, keine Mutation.
- **FR-4 (FX-Slippage):** `computeFxSlippage` berechnet aus `lockedRate` und `settledRate`
  die Slippage in Minor-Units und Basispunkten (Vorzeichen behält Richtung). Rein,
  deterministisch, injizierte Kurse.
- **FR-5 (Locked-Rate-Quote):** `quoteLockedRate` fixiert den Kurs zum Spendenzeitpunkt aus
  einer injizierten Rate-Tabelle (kein Netzwerk); enthält Kurs, Basis-/Ziel-Währung und
  `quotedAt`. Der Provider (Mock) liefert nur Rohkurse; die Fixierung ist reine Logik.
- **FR-6 (Payment-Method-per-Country):** `resolvePaymentMethods` liefert die für ein Land
  verfügbaren lokalen Methoden (deterministische Registry: KE→M-Pesa/Bank, NG→Mobile-Money/
  Bank, PH→GCash/Bank, BD→bKash/Bank, …) plus Card/SEPA als globalen Fallback.
- **FR-7 (Payout-Routing):** `decidePayoutRoute` entscheidet rein: `LOCAL_BANK`, wenn die
  Schule ein aktives Konto in Land + Währung des Payouts hat, sonst `INTERNATIONAL`
  (Fallback), mit `reason`. Keine Mutation, kein I/O.
- **FR-8 (i18n-Label-Resolver):** `resolveLabels` gibt für eine Locale + Key-Set die Labels
  zurück, fällt deterministisch auf `en` zurück, wenn eine Locale/ein Key fehlt. Reine
  Sample-Daten, keine Voll-Übersetzung.
- **FR-9 (Local-Bank-Detail-Formatter/Validator):** `formatLocalBankDetail` /
  `validateVirtualIban` prüfen und formatieren die display-only Bankdaten pro Land
  (Länge/Präfix/Mod-97-artige Prüfsumme für Virtual-IBAN). Rein, keine Netzwerk-Prüfung.
- **FR-10 (Per-Land-KYC-Requirement):** `resolveKycRequirement` liefert pro Land das
  geforderte Ausweisdokument (`BVN` für NG, `NATIONAL_ID` für KE/GH, `PASSPORT` als
  Default) + AML-Threshold-Hinweis. Speist die bestehende E11-Pipeline, baut sie nicht neu.
- **FR-11 (Deposit-Seam):** Lokale Deposits laufen über `LocalDepositProvider`
  (`initiateDeposit` → PENDING-Referenz; `local-payment.webhook` schließt den Status ab).
  Default `MockLocalDepositProvider` (deterministisch, `-FAIL`-Sentinel), Real-Provider
  (M-Pesa) ist ein kompilierendes Skeleton, in Tests nie aktiv. Env-gegateter Factory-Seam
  exakt wie `createPaymentProvider`.
- **FR-12 (Webhook-Signatur):** Der `local-payment.webhook`-Endpoint ist über den
  E6-`verifyWebhookSignature`-Guard gegatet (HMAC über Raw-Body, fail-closed 400
  `INVALID_SIGNATURE`); kein Status-Update ohne gültige Signatur.
- **FR-13 (Envelope + Boundary):** Alle JSON-Routen nutzen `{ success, data?, error? }`;
  Validierung an der Grenze (DTOs, whitelist, type-coercion off); Fehler laut via
  `DomainException`. Geld-Operationen validieren Minor-Unit-Korrektheit vor jeder Mutation.

## Key Entities

- **Currency (Registry, keine DB):** `code`, `decimals`, `symbol`, `name` — reine Tabelle
  der unterstützten Währungen (EUR, USD, KES, NGN, GHS, BDT, PHP, VND).
- **LocalPaymentMethod** — eine für ein Land verfügbare lokale Deposit-Methode (M-Pesa,
  Mobile Money, GCash, bKash, Local Bank Transfer); Enum + Länder-Zuordnung.
- **FxRate / lockedRate** — der zum Spendenzeitpunkt fixierte Kurs (Basis→Ziel), an der
  Donation gespeichert; plus optional der spätere `settledRate` für die Slippage.
- **SchoolPayoutAccount** — pro Schule/Land ein lokales Auszahlungskonto: Landeswährung,
  lokale Bank / Virtual-IBAN (display-only), aktiv-Flag. Payout-Ziel ist immer die Schule.
- **CountryKycRequirement (Registry, keine DB):** pro Land das geforderte Dokument + AML-
  Threshold-Hinweis, gelesen von der E11-Pipeline.
- **Donation (erweitert):** trägt `depositCurrency`, `depositMethod`, `lockedRate`,
  `payoutCurrency` — das Geld geht weiter an die Schule (E2/E12), nie an den Spender/Scholar.

## Success Criteria

- Produktmetriken (im Prototyp nicht messbar): +60% Spender-Conversion in lokalen Märkten;
  30+ lokale Methoden; FX-Slippage < 1%; Auszahlung in 6+ Landeswährungen.
- Prototyp-messbar: Ein Spender in Kenia sieht eine Kampagne in KES, wählt M-Pesa, sein
  Deposit wird über den Mock-Provider initiiert und per signiertem Webhook abgeschlossen.
  Eine USD-Corporate-Spende wird mit eingefrorenem Kurs nach KES konvertiert; die Schule
  wird in KES ausgezahlt (Ledger-Eintrag `DISBURSEMENT`, `LOCAL_BANK`-Route), die
  FX-Slippage wird berechnet. Der Donate-Flow zeigt Swahili-Labels. Kein Cent erreicht je
  einen Studierenden — jeder Payout zielt auf die verifizierte Schule.

## Out of Scope (ehrlich)

- **Modell-Korrektur (Kern):** Auszahlung geht in **Landeswährung an die SCHULE, nicht an
  Studierende**. Es gibt kein Studenten-Wallet, keine Scholar-Auszahlung — in keiner
  Währung. Lokale Methoden sind ausschließlich Donor-Deposit.
- **Keine echten Gateways** — M-Pesa, Mobile Money, GCash, bKash, lokale Banken sind hinter
  dem `LocalDepositProvider`-Seam **gemockt**; der Real-Provider ist ein kompilierendes
  Skeleton, in Tests nie aktiv. Kein echter Mangopay/Wise/Stripe-Global-Call.
- **Nur Mock-FX** — die Kurse kommen aus einer injizierten Tabelle (Mock-Provider); es gibt
  kein Live-FX-Feed, kein echtes Hedging, kein FX-Matching. Der `lockedRate` ist ein
  Prototyp-Freeze, kein reales Forward-Kontrakt.
- **i18n = Sample-Labels** — es sind Beispiel-Labels für den Donate-Flow in einigen Locales,
  keine vollständige App-Übersetzung, kein ICU-MessageFormat, keine RTL-Behandlung.
- **Virtual-IBANs sind display-only** — Format-/Prüfsummen-Validierung, aber keine echte
  IBAN-/Bank-Verifikation, keine Konto-Existenzprüfung, keine echte Virtual-Account-Vergabe.
- **Kein Live-Sanktions-/AML-Feed** — die Per-Land-KYC-Variation reicht nur ein
  länderspezifisches Requirement an die bestehende **E11-Mock**-Pipeline weiter; kein neuer
  externer AML-Provider, keine echten Sanktionslisten.
- **Kein Multi-Currency-Wallet-Balancing** — keine Bursa-eigene Multi-Currency-Treasury,
  kein Netting über Kampagnen, kein Liquiditäts-Pool. Jede Konvertierung ist pro
  Spende/Payout, nicht gepoolt.
- **Länderspezifische Steuer-/Spendenquittungs-Logik** (US-1099, EU-SEPA) bleibt bei E12/E14
  und wird hier nicht dupliziert.
- **Single-Instance** — der Ledger-Append serialisiert pro Schule wie in E12; keine
  verteilte Nebenläufigkeit über die FX-Konvertierung hinaus.
