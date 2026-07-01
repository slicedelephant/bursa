# Data Model — Feature 021 Multi-Currency & lokale Zahlungsmethoden (E20)

Geld ist immer ein `Int` in **Minor-Units**. Nur der Wechselkurs (`lockedRate`) ist ein
`Float`. IDs sind `cuid()`. Der Payout zielt immer auf die **Schule** (Constitution II).

## Neue Enums (4)

### Enum Currency

```
EUR  USD  KES  NGN  GHS  BDT  PHP  VND
```

Die Anzeige-Metadaten (`decimals`, `symbol`, `name`) leben in der reinen Registry
`fx/currency.ts`, nicht in der DB. Der Enum stellt nur die erlaubten Codes sicher.

### Enum LocalPaymentMethod

```
CARD           // globaler Fallback (E2)
SEPA           // globaler Fallback (E2, Corporate)
MPESA          // KE
MOBILE_MONEY    // NG, GH, …
GCASH          // PH
BKASH          // BD
LOCAL_BANK_TRANSFER
```

### Enum PayoutRoute

```
LOCAL_BANK      // direkt auf lokales Schul-Konto in Land+Währung
INTERNATIONAL   // Fallback-Transfer
```

### Enum LocalDepositStatus

```
PENDING     // initiiert, wartet auf Gateway-Webhook
SUCCEEDED   // Webhook: bestätigt
FAILED      // Webhook: fehlgeschlagen
```

## Neues Modell (1)

### SchoolPayoutAccount

Pro Schule und Land ein lokales Auszahlungskonto. Payout-Ziel ist immer die Schule.

```
id              String   @id @default(cuid())
schoolId        String
country         String                       // ISO-2, z.B. "KE"
currency        Currency                     // Landeswährung des Kontos
bankName        String
accountNumber   String
virtualIban     String?                      // display-only (Format-validiert)
active          Boolean  @default(true)
createdAt       DateTime @default(now())

school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

@@unique([schoolId, country, currency])
@@index([schoolId])
```

## Erweiterte Modelle (2)

### School (Ergänzung)

```
// ---- E20: multi-currency local payout accounts (target is always the school) ----
payoutAccounts   SchoolPayoutAccount[]
```

### Donation (Ergänzung — money geht weiter an die Schule, nie an den Spender/Scholar)

```
// ---- E20: multi-currency + local deposit (donor side only) ----
depositCurrency    Currency?                  // Währung, in der der Spender zahlt
depositMethod      LocalPaymentMethod?        // gewählte lokale Methode
lockedRate         Float?                     // zum Deposit fixierter FX-Kurs (deposit→payout)
payoutCurrency     Currency?                  // Zielwährung der Schul-Auszahlung
localDepositRef    String?                    // Referenz des LocalDepositProvider
localDepositStatus LocalDepositStatus?        // PENDING → SUCCEEDED/FAILED (per Webhook)
```

## Registries (rein, keine DB)

- **Currency-Registry** (`fx/currency.ts`) — `{ code, decimals, symbol, name }` je Währung.
- **PaymentMethod-per-Country** (`fx/payment-method-resolver.ts`) — `country → LocalPaymentMethod[]`.
- **i18n-Labels** (`fx/i18n-labels.ts`) — `locale → { key → label }` (en/sw/yo/bn/tl).
- **CountryKycRequirement** (`fx/country-kyc-requirement.ts`) —
  `country → { document, amlThresholdMinor }`.
- **Mock-FX-Tabelle** (`payments/local` bzw. `fx/mock-fx-rate.provider.ts`) —
  `base|quote → rate` (deterministisch).

## View-/Pure-Logic-Typen (rein, keine DB)

- `CurrencyInfo` `{ code; decimals; symbol; name }`
- `ConversionResult` `{ amountMinor; from; to; rate }`
- `FxSlippage` `{ slippageMinor; slippageBps; direction: 'GAIN' | 'LOSS' | 'FLAT' }`
- `LockedRateQuote` `{ base; quote; rate; quotedAt }`
- `PayoutRouteDecision` `{ route; accountId?; reason }`
- `KycRequirement` `{ document: 'BVN' | 'NATIONAL_ID' | 'PASSPORT'; amlThresholdMinor }`
- `LocalBankDetailView` `{ country; bankName; accountNumber; virtualIban?; valid }`

## Invarianten

- **Geld an die Schule:** Jeder Payout (jede Währung) targetet `School` +
  `SchoolPayoutAccount`/`payoutAccountRef`; kein Pfad zahlt an einen Studierenden.
- **Minor-Unit-Integrität:** Gespeichertes Geld ist immer `Int` in Minor-Units;
  Konvertierung rundet round-half-up über die Ziel-`decimals`; gleiche Währung = No-Op.
- **Locked-Rate:** Der FX-Kurs wird zum Deposit fixiert (`Donation.lockedRate`) und ändert
  sich danach nicht; die Slippage misst nur die Differenz zum späteren `settledRate`.
- **Webhook-Gate:** `localDepositStatus` wechselt nur über einen signatur-geprüften Webhook
  von `PENDING` auf `SUCCEEDED`/`FAILED`.
- **Append-only Ledger:** Payouts erzeugen `LedgerEntry`-Einträge (`DISBURSEMENT`), die nie
  mutiert werden (Constitution IV).
