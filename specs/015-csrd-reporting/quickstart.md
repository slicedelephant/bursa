# Quickstart — Feature 015 CSRD-Reporting (E14)

Lokaler Smoke-Test der ESG/CSRD-Reporting-Schicht. Setzt eine laufende DB
(`docker compose up -d`, Host-Port 5433) und einen Seed voraus.

## 1. Migration + Seed

```bash
cd apps/api
npx prisma migrate deploy        # wendet csrd_reporting an
npx prisma migrate status        # erwartet: up to date
npm run seed                     # ESG-Tags, Diversity-Demo, ein Report, ein Auditor-Grant
```

## 2. Tests + Builds

```bash
npm --prefix apps/api run test:cov     # alle pure-logic-Gates >= 80%
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 3. API-Smoke (Admin-Token vorausgesetzt)

```bash
# Admin-Login (Seed-Admin) → TOKEN
ADMIN=$(curl -s localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@bursa.org","password":"<seed-pw>"}' | jq -r .data.accessToken)

# Ledger-Eintrag taggen
curl -s localhost:3000/admin/esg/tags -H "authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' \
  -d '{"ledgerEntryId":"<id>","category":"QUALITY_EDUCATION"}' | jq

# Report (GRI 2024, laufendes Jahr)
curl -s "localhost:3000/admin/esg/report?standard=GRI_2024" -H "authorization: Bearer $ADMIN" | jq

# Data-Quality + Trend
curl -s localhost:3000/admin/esg/data-quality -H "authorization: Bearer $ADMIN" | jq
curl -s localhost:3000/admin/esg/trend -H "authorization: Bearer $ADMIN" | jq

# Auditor-Grant erzeugen (Raw-Token nur hier!)
TOKEN=$(curl -s localhost:3000/admin/esg/auditor-grants -H "authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' -d '{"label":"smoke","ttlHours":48}' | jq -r .data.token)

# Audit-Portal öffnen (öffentlich, read-only)
curl -s "localhost:3000/audit-portal/$TOKEN" | jq
```

## 4. Exporte

```bash
# Report-Snapshot persistieren → ID
RID=$(curl -s localhost:3000/admin/esg/reports -H "authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' -d '{"standard":"CSRD_ESRS"}' | jq -r .data.id)

curl -s "localhost:3000/admin/esg/reports/$RID/export.csv" -H "authorization: Bearer $ADMIN" -o report.csv
curl -s "localhost:3000/admin/esg/reports/$RID/export.pdf" -H "authorization: Bearer $ADMIN" -o report.pdf
# report.pdf öffnet als valides PDF; Fußnoten verweisen auf Quell-entryHash.
```

## 5. Frontend

- ADMIN-Login → `/admin/csrd`: Report-Builder (Standard-Picker + Generate + CSV/PDF),
  Data-Quality-Panel, Year-over-Year-Trend, Auditor-Access-Panel (Grant erzeugen/widerrufen,
  Portal-Link kopieren).

## Erwartete Invarianten

- Tagging ändert keinen Ledger-Eintrag → `GET /school/ledger` zeigt weiterhin
  `integrity.valid = true`.
- Auditor-Portal nach Ablauf/Revoke → 401/403.
- `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --exit-code`
  → "No difference detected".
