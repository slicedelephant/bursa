# API Contract 013 — Payout-Reconciliation & Transparenz-Layer (E12)

Alle JSON-Antworten nutzen den globalen `{ success, data? }` / `{ success: false, error }`-
Envelope. Die drei Datei-Exporte (CSV/PDF) streamen direkt via `@Res()` und umgehen den
Response-Interceptor (wie der E5-Corporate-Export). Geld weiterhin nur an die Schule.

## School-Admin-Endpunkte (`/school`, JwtAuthGuard + RolesGuard, Role SCHOOL_ADMIN)

Alle Routen sind auf die eigene Schule des eingeloggten School-Admins skopiert
(`SchoolPortalService.resolveSchoolId`), exakt wie die bestehenden E8-Portal-Routen.

### `GET /school/reconciliation`
Führt einen Reconciliation-Lauf für die eigene Schule aus (liest die System-Payouts +
den Bank-Feed über den `BankFeedProvider`) und liefert das Ergebnis. Persistiert
zusätzlich einen `Reconciliation`-Verlauf.

Response `data`: `ReconciliationView`.

### `GET /school/reconciliation/payouts`
Auszahlungs-History der eigenen Schule mit Status und (falls vorhanden) gematchter
Bank-Transaktion + Discrepancy-Flag.

Response `data`: `PayoutRowView[]`.

### `GET /school/reconciliation/export.csv`
CSV-Export der Auszahlungs-Liste (Datum, Kampagne, Betrag, Status, Bank-Match, Diskrepanz).
`Content-Type: text/csv`.

### `GET /school/reconciliation/export.pdf`
PDF-Export derselben Liste (E5-`buildSimplePdf`). `Content-Type: application/pdf`.

### `GET /school/reconciliation/tax-report.csv`
Tax-Report der eigenen Schule (US 1099 / EU SEPA, je nach `School.country`) als CSV.
`Content-Type: text/csv`.

### `GET /school/reconciliation/accounting.csv`
Double-Entry-Buchhaltungs-Export (Debit/Credit-Journal-Zeilen mit GL-Codes) als CSV
für QuickBooks/Wave/NetSuite-Import. `Content-Type: text/csv`.

### `GET /school/ledger`
Append-only Ledger-Einträge der eigenen Schule (neueste zuerst) plus ein
Integritäts-Check der Hash-Chain.

Response `data`: `LedgerView`.

## Öffentlicher Endpunkt (kein Auth)

### `GET /transparency/schools/:schoolId`
Aggregierte, PII-freie Funding-Statistiken einer Schule für die Einbettung auf
Schul-Websites. **Keine** einzelnen Spender, keine Namen/IDs — nur Aggregate.

Response `data`: `TransparencyView`.

## View-Shapes

```ts
interface ReconciliationView {
  schoolId: string;
  runAt: string;
  summary: {
    matchedCount: number;
    pendingCount: number;
    unmatchedCount: number;   // > 48h ohne Bank-Tx → Alert
    discrepancyCount: number;
    bankTxCount: number;
  };
  rows: PayoutRowView[];
  unmatchedBankTx: BankTxView[];   // Bank-Transaktionen ohne System-Payout (orphan)
  alerts: StaleAlertView[];        // 48h-stale Auszahlungen
}

interface PayoutRowView {
  payoutId: string;
  campaignTitle: string;
  amountCents: number;
  currency: string;
  payoutStatus: 'PENDING' | 'SENT' | 'CONFIRMED';
  reconciliationStatus: 'MATCHED' | 'PENDING' | 'UNMATCHED' | 'DISCREPANCY';
  bankTx: BankTxView | null;
  discrepancyCents: number | null;  // Betrags-Differenz bei DISCREPANCY
  sentAt: string | null;
}

interface BankTxView {
  externalId: string;
  amountCents: number;
  currency: string;
  reference: string | null;
  postedAt: string;
}

interface StaleAlertView {
  payoutId: string;
  campaignTitle: string;
  amountCents: number;
  hoursStale: number;
}

interface LedgerView {
  schoolId: string;
  integrity: { valid: boolean; checkedCount: number; brokenAtSequence: number | null };
  entries: {
    sequence: number;
    entryType: 'DONATION' | 'PAYOUT' | 'DISBURSEMENT';
    amountCents: number;
    currency: string;
    reason: string;
    refType: string | null;
    refId: string | null;
    entryHash: string;
    createdAt: string;
  }[];
}

interface TransparencyView {
  schoolId: string;
  schoolName: string;
  totalRaisedCents: number;
  totalPaidOutCents: number;
  donationCount: number;
  avgDonationCents: number;
  studentsSupported: number;
  donorGeography: { country: string; donationCount: number; amountCents: number }[];
}
```

## Error Codes

| Code | HTTP | Wann |
|---|---|---|
| `NOT_FOUND` | 404 | Schule/Payout existiert nicht (oder nicht die eigene Schule) |
| `FORBIDDEN` | 403 | Nutzer ist nicht an eine Schule gebunden / falsche Rolle |
| `VALIDATION_ERROR` | 400 | DTO-/Param-Validierung fehlgeschlagen |
