# Quickstart 013 — Payout-Reconciliation & Transparenz-Layer (E12)

## Voraussetzungen

- Postgres läuft (docker compose, Host-Port 5433).
- `apps/api/.env` mit `DATABASE_URL`. Default-Provider ist der Mock — kein Bank-Feed-Key
  nötig.

## Env-Flags (alle optional, Default = Mock)

```
BANK_FEED_PROVIDER=mock     # oder "plaid" (braucht PLAID_SECRET)
PLAID_SECRET=...            # nur für echten Plaid-Bank-Feed
PLAID_CLIENT_ID=...         # optional, nur für echten Plaid-Provider
```

Ohne diese Variablen läuft die komplette Reconciliation deterministisch ohne Netzwerk.

## Migration anwenden

Bevorzugt:
```
cd apps/api
npx prisma migrate dev --name payout_reconciliation
```

Falls `migrate dev` non-interaktiv blockiert, das SQL erzeugen und deployen:
```
cd apps/api
mkdir -p prisma/migrations/<timestamp>_payout_reconciliation
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_payout_reconciliation/migration.sql
npx prisma migrate deploy
npx prisma generate
```

Bestätigen:
```
npx prisma migrate status   # → up to date
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # → "No difference detected"
```

## Seed (idempotent)

```
npm --prefix apps/api run seed
```

Legt an: Ledger-Einträge für die bestehenden Spenden/Auszahlungen (mit Hash-Chain), eine
**gematchte** Bank-Transaktion (für die ausgezahlte Kampagne), eine **unmatched/stale**
Auszahlung (Sentinel-Referenz `…-STALE`, > 48h, kein Bank-Match → 48h-Alert) und eine
**orphan** Bank-Transaktion ohne System-Payout.

## Demo-Flow (curl, gegen laufende API)

School-Admin (JWT als SCHOOL_ADMIN):
```
# Reconciliation-Lauf
curl localhost:3000/api/school/reconciliation -H "Authorization: Bearer $JWT"

# Auszahlungs-History
curl localhost:3000/api/school/reconciliation/payouts -H "Authorization: Bearer $JWT"

# Exporte (CSV/PDF)
curl localhost:3000/api/school/reconciliation/export.csv -H "Authorization: Bearer $JWT"
curl localhost:3000/api/school/reconciliation/export.pdf -H "Authorization: Bearer $JWT" -o payouts.pdf
curl localhost:3000/api/school/reconciliation/tax-report.csv -H "Authorization: Bearer $JWT"
curl localhost:3000/api/school/reconciliation/accounting.csv -H "Authorization: Bearer $JWT"

# Append-only Ledger + Integritäts-Check
curl localhost:3000/api/school/ledger -H "Authorization: Bearer $JWT"
```

Öffentlich (kein Auth):
```
curl localhost:3000/api/transparency/schools/<schoolId>
```

## Tests / Builds

```
npm --prefix apps/api run test:cov     # Per-Path-Gates grün
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Frontend

- `/school` → neue Tab **Reconciliation** (Tabelle matched/unmatched/pending +
  Discrepancy-Flags + Alerts + Export-Buttons + Ledger-Integrität).
- `/transparency/:schoolId` (öffentlich) → aggregierte Schul-Statistiken zum Einbetten.

## Mock-Bank-Feed-Sentinels (deterministisch)

| Payout-Referenz endet auf … | Bank-Feed-Ergebnis |
|---|---|
| (Standard) | passende Bank-Tx, gleicher Betrag → MATCHED |
| `-STALE` | keine Bank-Tx, Payout > 48h alt → UNMATCHED + 48h-Alert |
| `-DISCREPANCY` | Bank-Tx mit abweichendem Betrag → DISCREPANCY |
| (zusätzlich) | eine orphan Bank-Tx ohne Payout → ORPHAN_BANK_TX |
