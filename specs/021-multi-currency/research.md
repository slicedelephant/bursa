# Research & Clarify — Feature 021 Multi-Currency & lokale Zahlungsmethoden (E20)

## Entscheidung 1 — Payout in Landeswährung an die SCHULE, nie an Studierende (Modell-Korrektur)

**Entscheidung:** Jeder Payout — in EUR, USD, KES, NGN, GHS, BDT, PHP, VND — geht über
`PaymentProvider.createPayout({ amountCents, currency, schoolName, accountRef, description })`
an die **verifizierte Schule** und wird als `LedgerEntry` (`entryType: 'DISBURSEMENT'`,
`currency`) im append-only Ledger festgehalten. Es gibt kein Studenten-Wallet, keinen
Auszahlungspfad an einen Scholar — in keiner Währung.

**Begründung:** Constitution II ist bindend ("money is always disbursed to the school,
never to a student wallet"). Der Auftrag korrigiert das ursprüngliche Roadmap-Framing
explizit: lokale Methoden und Multi-Currency existieren für die **Spender-Einzahlung**;
die Auszahlung bleibt an der Schule. Das ist der Trust-USP und der rechtliche Schutzschild.
`MovementInput.currency` existiert im E12-Ledger bereits — der Ledger ist von Haus aus
multi-currency-fähig, wir bauen keinen zweiten.

**Konsequenz:** `SchoolPayoutAccount` und der Payout-Pfad tragen `payoutCurrency` + `schoolId`
(Ziel), aber kein Feld, das an einen Scholar zahlen könnte. Ein Payout ohne verifizierte
Schule (`payoutVerified = false`) wird an der Grenze abgelehnt (`DomainException('SCHOOL_
NOT_VERIFIED', …, 409)`).

## Entscheidung 2 — Lokale Deposit-Provider in der E2-Linie (`LocalDepositProvider`)

**Entscheidung:** Die lokalen Donor-Deposit-Methoden (M-Pesa, Mobile Money, GCash, bKash,
Local Bank Transfer) sitzen hinter einem eigenen Seam `LocalDepositProvider` mit
`LOCAL_DEPOSIT_PROVIDER`-Symbol und env-gegateter Factory `createLocalDepositProvider(env)`.
Default ist `MockLocalDepositProvider` (deterministisch, `-FAIL`-Sentinel), `MpesaDepositProvider`
ist ein kompilierendes Real-Skeleton (lazy require), in Tests nie aktiv.

**Begründung:** Der Auftrag: "local payment methods are additional PaymentProvider-style
implementations for the donor DEPOSIT; copy the exact provider+factory seam." Constitution III
verlangt Provider-Abstraktion. Der Seam kopiert `payment-provider.factory.ts` 1:1 in der
Struktur (Flag + Key → real, sonst Mock, Fallback nie crashen).

**Konsequenz:** `initiateDeposit` liefert nur eine PENDING-Referenz; der finale Status kommt
über den signierten Webhook (Entscheidung 6). Kein echter Gateway-Call im Prototyp —
"mock hard", steht im Out-of-Scope.

## Entscheidung 3 — Mock-FX-Provider + reine Locked-Rate-Fixierung, deterministisch

**Entscheidung:** `FxRateProvider` (`getRate({ base, quote })`) mit `FX_RATE_PROVIDER`-Symbol
und `createFxRateProvider(env)`-Factory liefert nur Rohkurse (Default `MockFxRateProvider`,
deterministische Tabelle). Die **Fixierung** (`quoteLockedRate`) und jede **Konvertierung**
(`convertMinorUnits`) sind reine Funktionen mit **injizierten** Kursen und `now` — kein
`Date.now()`, kein Netz in der Kern-Logik.

**Begründung:** Der Auftrag: "a mock FX-rate provider … convert with a locked-in rate
(hedged at campaign/donation time); track FX slippage … Inject rates/now (no Date.now() in
pure fns)." Deterministische Tests brauchen injizierte Kurse. Der `lockedRate` friert den
Kurs zum Spendenzeitpunkt ein — Prototyp-Freeze, kein echter Forward-Kontrakt.

**Konsequenz:** Der fixierte Kurs wird an der `Donation` gespeichert (`lockedRate`,
`depositCurrency`, `payoutCurrency`). `computeFxSlippage(lockedRate, settledRate)` liefert
die Slippage in Minor-Units + Basispunkten für das Tracking.

## Entscheidung 4 — Money strikt in integer Minor-Units, `decimals` pro Währung

**Entscheidung:** Gespeichertes Geld ist immer ein `Int` in Minor-Units. Jede Währung trägt
in der Registry ihre `decimals` (EUR/USD/KES/NGN/… = 2 im Prototyp; das Modell trägt das
Feld, damit 0-Dezimal-Währungen später korrekt sind). Konvertierung rundet **round-half-up**
über die Ziel-Dezimalstellen; niemals werden Floats als Geld gespeichert. Nur der
**Wechselkurs** selbst ist ein `Float`.

**Begründung:** Der Auftrag: "Be careful with money math — use integer minor units, no
floats for money … money/minor-unit safe." Float-Geld driftet; das ist bei Multi-Currency-
Konvertierung besonders gefährlich. Constitution V verlangt Minor-Unit-Korrektheit vor der
Mutation.

**Konsequenz:** `money-minor-unit.ts` kapselt `toMinorUnits`/`fromMinorUnits`/`roundHalfUp`;
`convertMinorUnits` nutzt nur Integer-Arithmetik + eine finale Rundung. Gleiche Währung ist
ein Identitäts-No-Op (kein Rundungsfehler).

## Entscheidung 5 — Payout-Routing als reine Entscheidung (Local-Bank vs. International)

**Entscheidung:** `decidePayoutRoute({ payoutCountry, payoutCurrency, accounts })` gibt
`LOCAL_BANK` zurück, wenn die Schule ein **aktives** `SchoolPayoutAccount` in Land **und**
Währung des Payouts hat, sonst `INTERNATIONAL` (Fallback), jeweils mit `reason` und
optionaler `accountId`. Rein, keine Mutation, kein I/O.

**Begründung:** Der Auftrag: "payout routing to the SCHOOL: direct-to-local-bank when
possible, fallback to international transfer (mock routing decision)." Eine reine
Entscheidung ist trivial testbar und hält den Service dünn.

**Konsequenz:** Der Service übergibt die gewählte Route + `accountRef` an
`PaymentProvider.createPayout`; der eigentliche Transfer bleibt gemockt. Kein echter
Wise-/Mangopay-Call.

## Entscheidung 6 — Local-Payment-Webhook über den E6-Signatur-Guard

**Entscheidung:** Der `POST /fx/webhook`-Endpoint ist über einen `LocalPaymentWebhookGuard`
gegatet, der das E6-Muster kopiert: `verifyWebhookSignature({ rawBody, header, secret,
nowSec })`, fail-closed `400 INVALID_SIGNATURE`. Eigener Header (`x-local-payment-signature`)
+ eigenes Secret (`LOCAL_PAYMENT_WEBHOOK_SECRET`).

**Begründung:** Der Auftrag: "mock status-update webhooks (reuse the E6 webhook-signature
guard pattern)." Kein neuer Signatur-Algorithmus — dieselbe pure HMAC-SHA256-Prüfung wie
bei den Stripe-Webhooks. Kein Status-Update ohne gültige Signatur (Constitution VI).

**Konsequenz:** Die App wird bereits mit `{ rawBody: true }` erstellt (E6); der neue Guard
liest denselben Raw-Body. Ohne Secret in Dev ist der Guard bewusst tolerant wie das
E6-Pendant.

## Entscheidung 7 — Per-Land-KYC-Variation speist E11, baut sie nicht neu

**Entscheidung:** `resolveKycRequirement(country)` liefert pro Land nur das geforderte
Dokument (`BVN` für NG, `NATIONAL_ID` für KE/GH, `PASSPORT` als Default) + einen
AML-Threshold-Hinweis. Diese reine Registry wird von der bestehenden E11-Pipeline gelesen;
es entsteht kein neuer Identity-/AML-Provider.

**Begründung:** Der Auftrag: "per-country KYC requirement variation (e.g. BVN vs passport)
reuses the E11 pipeline." Constitution IV (kein Neubau). Der neue Teil ist nur die
länderspezifische Anforderungs-Tabelle, nicht die Verifikations-Mechanik.

**Konsequenz:** Kein Live-Sanktions-/AML-Feed über den E11-Mock hinaus (Out-of-Scope). Die
AML-Thresholds sind Minor-Unit-Hinweise, keine echten regulatorischen Grenzwerte.

## Entscheidung 8 — i18n = Sample-Label-Tabelle mit `en`-Fallback

**Entscheidung:** `resolveLabels(locale, keys)` liest eine reine Sample-Tabelle für en, sw
(Swahili), yo (Yoruba), bn (Bengali), tl (Tagalog) und fällt deterministisch auf `en`
zurück, wenn Locale oder Key fehlt. Nur der Donate-Flow-Key-Set (Betrag, Methode wählen,
Bestätigen, "Geht an die Schule", …).

**Begründung:** Der Auftrag: "i18n covers a few locales as sample data not full translation."
Ein voller ICU-/RTL-i18n-Stack wäre XL für sich allein; die Sample-Tabelle deckt die
Business-Aussage (lokalisierter Donate-Flow) ohne diesen Aufwand.

**Konsequenz:** Der gleiche Resolver-Kern wird im Frontend gespiegelt (`i18n-resolve.ts`),
damit UI und Backend nicht driften. Keine App-weite Übersetzung, kein RTL (Out-of-Scope).

## Entscheidung 9 — Virtual-IBANs display-only, Format-/Prüfsummen-Validierung

**Entscheidung:** `validateVirtualIban(value)` prüft Länge, Präfix und eine
Mod-97-artige Prüfsumme; `formatLocalBankDetail` normalisiert die Anzeige (Gruppierung). Es
gibt keine echte IBAN-/Konto-Verifikation, keine Bank-Anbindung, keine Virtual-Account-
Vergabe.

**Begründung:** Der Auftrag: "virtual IBANs are display-only." Eine reine Format-/Prüfsummen-
Validierung fängt Tippfehler ab, ohne einen echten Bank-Provider zu brauchen.

**Konsequenz:** `SchoolPayoutAccount.virtualIban` ist display-only; die Routing-Entscheidung
(Entscheidung 5) hängt am `country`/`currency`/`active`-Flag, nicht an einer echten
IBAN-Verifikation.

## Entscheidung 10 — Modul-Schnitt: eigenes `fx`-Modul + `payments/local`-Seam

**Entscheidung:** Neues Feature-Modul `apps/api/src/fx/` (Currency/FX/Routing/i18n/Konten/
Payout). Der Deposit-Provider-Seam liegt unter `apps/api/src/payments/local/`, weil er die
E2-Linie verlängert (`PaymentProvider`-Nachbarschaft). `FxModule` importiert `LedgerModule`
und nutzt den globalen `PaymentsModule`-Seam; es bindet `LOCAL_DEPOSIT_PROVIDER` und
`FX_RATE_PROVIDER` per env-gegateter Factory.

**Begründung:** Hohe Kohäsion, niedrige Kopplung (Constitution IV). Der Deposit-Seam gehört
strukturell zu `payments/`; die Multi-Currency-/Routing-/i18n-Logik ist ein eigenes Feature.
Web: neue `features/donate/` (lokalisierter Flow) + `features/school-settings/`
(Currency-Konto).

**Konsequenz:** `FxModule` wird in `app.module.ts` nach `ScholarshipModule` registriert. Der
Ledger wird nur read-appended, nie mutiert. Die `payments/local/`-Dateien werden im
`FxModule` (nicht im `PaymentsModule`) gebunden, um den E2-Seam nicht zu verändern.
