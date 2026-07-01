# API Contracts — Feature 021 Multi-Currency & lokale Zahlungsmethoden (E20)

Alle JSON-Antworten nutzen den `{ success, data?, error? }`-Envelope (globaler Interceptor).
Fehler sind `DomainException(code, message, status)`. **Jeder Payout zielt auf die Schule.**

## FX & Local Methods (`@Controller('fx')`)

### GET /fx/currencies (öffentlich)

Liefert die unterstützten Währungen aus der Registry.

```
200 { success: true, data: [
  { code: "EUR", decimals: 2, symbol: "€",   name: "Euro" },
  { code: "KES", decimals: 2, symbol: "KSh", name: "Kenyan Shilling" }, …
] }
```

### GET /fx/quote?base=USD&quote=KES (öffentlich, lesend)

Fixiert den aktuellen Kurs aus dem (Mock-)FX-Provider (`quoteLockedRate`).

```
200 { success: true, data: { base: "USD", quote: "KES", rate: 129.5, quotedAt: "…Z" } }
400 UNKNOWN_CURRENCY | UNKNOWN_RATE_PAIR
```

### GET /fx/methods?country=KE (öffentlich)

Verfügbare lokale Deposit-Methoden für ein Land (+ Card-Fallback).

```
200 { success: true, data: { country: "KE", methods: ["MPESA","LOCAL_BANK_TRANSFER","CARD"] } }
```

### GET /fx/labels?locale=sw (öffentlich)

Donate-Flow-Labels für eine Locale (Fallback `en`).

```
200 { success: true, data: { locale: "sw", labels: { amount: "Kiasi", pay_with: "Lipa na", to_school: "Huenda shuleni", … } } }
```

### POST /fx/deposits (öffentlich / DONOR)

Initiiert einen lokalen Donor-Deposit (Mock-Provider → PENDING-Referenz). Zahlt der Spender
in einer anderen Währung als die Schule bezahlt wird, wird der Kurs hier fixiert.

```
Body: {
  campaignId: string,
  amountMinor: number,          // in depositCurrency-Minor-Units
  depositCurrency: Currency,
  method: LocalPaymentMethod,
  country: string,
  payoutCurrency: Currency      // Zielwährung der Schule
}
201 { success: true, data: {
  depositRef: string, status: "PENDING",
  lockedRate: 129.5,
  payoutAmountMinor: number     // konvertiert, geht an die Schule
} }
400 UNKNOWN_CURRENCY | UNSUPPORTED_METHOD | INVALID_AMOUNT
```

### POST /fx/school-accounts (`SCHOOL_ADMIN` / `ADMIN`)

Legt ein lokales Auszahlungskonto für eine Schule an (Payout-Ziel).

```
Body: { schoolId, country, currency, bankName, accountNumber, virtualIban? }
201 { success: true, data: { id, schoolId, country, currency, active: true } }
400 INVALID_VIRTUAL_IBAN | UNKNOWN_CURRENCY
409 ACCOUNT_EXISTS
```

### GET /fx/school-accounts/:schoolId (`SCHOOL_ADMIN` / `ADMIN`)

```
200 { success: true, data: [ { id, country, currency, bankName, virtualIban, active } ] }
```

### POST /fx/payouts (`ADMIN`)

Zahlt einen Betrag in Landeswährung **an die Schule** aus — Routing + Ledger.

```
Body: { schoolId, amountMinor, payoutCurrency, payoutCountry, reason, refId? }
201 { success: true, data: {
  route: "LOCAL_BANK" | "INTERNATIONAL",
  payoutRef: string,
  ledgerSequence: number,
  currency: "KES"
} }
409 SCHOOL_NOT_VERIFIED | NO_PAYOUT_ACCOUNT
```

## Local-Payment Webhook (`@Controller('fx')`, `LocalPaymentWebhookGuard`, rawBody)

### POST /fx/webhook (signatur-geprüft)

Status-Update eines lokalen Deposits vom (gemockten) Gateway. Nur mit gültiger
`x-local-payment-signature` (HMAC über Raw-Body, E6-Muster).

```
Header: x-local-payment-signature: t=<ts>,v1=<hmac>
Body:   { depositRef: string, status: "SUCCEEDED" | "FAILED", providerRef?: string }
200 { success: true, data: { depositRef, status } }
400 INVALID_SIGNATURE
404 DEPOSIT_NOT_FOUND
```

## Fehler-Codes

| Code | Status | Bedeutung |
|---|---|---|
| `UNKNOWN_CURRENCY` | 400 | Währungscode nicht in der Registry |
| `UNKNOWN_RATE_PAIR` | 400 | Kein Kurs für dieses base/quote-Paar |
| `UNSUPPORTED_METHOD` | 400 | Methode für dieses Land nicht verfügbar |
| `INVALID_AMOUNT` | 400 | Betrag ≤ 0 oder kein Integer-Minor-Unit |
| `INVALID_VIRTUAL_IBAN` | 400 | Virtual-IBAN-Format/Prüfsumme ungültig |
| `ACCOUNT_EXISTS` | 409 | Schule hat bereits ein Konto in Land+Währung |
| `SCHOOL_NOT_VERIFIED` | 409 | Schule ohne verifiziertes Payout-Konto |
| `NO_PAYOUT_ACCOUNT` | 409 | Kein aktives Konto für Land+Währung (Payout) |
| `INVALID_SIGNATURE` | 400 | Webhook-Signatur ungültig (fail-closed) |
| `DEPOSIT_NOT_FOUND` | 404 | Webhook referenziert unbekannten Deposit |

## Muster (kein Endpoint)

- **Payout-Routing:** `decidePayoutRoute` (rein) wählt LOCAL_BANK/INTERNATIONAL; der Service
  ruft dann `PaymentProvider.createPayout` + `LedgerService.append`.
- **KYC-Requirement:** `resolveKycRequirement(country)` (rein) speist die E11-Pipeline; kein
  eigener Endpoint in E20.
