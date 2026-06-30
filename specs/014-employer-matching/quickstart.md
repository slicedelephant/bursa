# Quickstart 014 — Employer Matching Auto-Detection (E13)

## Voraussetzungen

- Postgres läuft (docker compose, Host-Port 5433).
- `apps/api/.env` mit `DATABASE_URL` (siehe `apps/api/.env`).
- Default ohne weitere Keys: `EMPLOYER_MATCH_PROVIDER=mock`.

## Env-Flags (alle optional, Default = Mock)

```bash
EMPLOYER_MATCH_PROVIDER=mock   # mock (Default) | dtd
DTD_API_KEY=                   # nur nötig für den echten Double-the-Donation-Adapter
```

Ohne Flag/Key läuft alles über `MockEmployerMatchProvider` (kein Netz, in allen
Tests genutzt). `dtd` aktiviert das `DoubleTheDonationProvider`-Skeleton nur, wenn
zusätzlich ein `DTD_API_KEY` gesetzt ist; sonst Fallback auf Mock.

## Migration anwenden

```bash
cd apps/api
npx prisma migrate dev --name employer_matching
```

Falls `migrate dev` nicht-interaktiv blockiert, der Fallback:

```bash
cd apps/api
export DATABASE_URL="postgresql://fundingapp:fundingapp@localhost:5433/fundingapp?schema=public"
mkdir -p prisma/migrations/<timestamp>_employer_matching
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_employer_matching/migration.sql
npx prisma migrate deploy
npx prisma migrate status            # → up to date
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # → "No difference detected"
```

## Seed (idempotent)

```bash
cd apps/api && npm run seed
```

Seedet ~30 `EmployerMatchProgram`-Einträge (SAP, Google, Siemens, Novartis …),
setzt `donor@bursa.test` auf den Arbeitgeber `SAP` (`employerDomain=sap.com`) mit
einer Demo-`MatchClaim` + committeter Match-Spende, sodass Balance + Claim-History
im Account sofort sichtbar sind.

## Demo-Flow (curl, gegen laufende API)

```bash
API=http://localhost:3000/api

# 1) Detect (anonym)
curl -s -X POST $API/matching/detect \
  -H 'content-type: application/json' \
  -d '{"workEmail":"jane@google.com","locale":"de"}' | jq

# 2) Offer für eine konkrete Spende
curl -s -X POST $API/matching/offer \
  -H 'content-type: application/json' \
  -d '{"campaignId":"<CAMPAIGN_ID>","donationCents":10000,"workEmail":"jane@sap.com"}' | jq

# 3) Claim (idempotent je Spende) — als eingeloggter DONOR mit Bearer-Token
curl -s -X POST $API/matching/claim \
  -H "authorization: Bearer <DONOR_JWT>" -H 'content-type: application/json' \
  -d '{"donationId":"<DONATION_ID>","workEmail":"jane@sap.com"}' | jq

# 4) Balance + History
curl -s $API/matching/me/balance -H "authorization: Bearer <DONOR_JWT>" | jq
```

## Mock-Arbeitgeber-DB (deterministisch)

`MockEmployerMatchProvider` hält ~30 bekannte Firmen. Beispiele:

| Domain        | Employer  | Ratio | Jahres-Cap | Level       |
|---------------|-----------|-------|------------|-------------|
| sap.com       | SAP       | 1:1   | 5.000 €    | PORTAL      |
| google.com    | Google    | 1:1   | 5.000 €    | AUTO_SUBMIT |
| siemens.com   | Siemens   | 2:1   | 3.000 €    | MANUAL      |
| novartis.com  | Novartis  | 1:1   | 10.000 €   | PORTAL      |

Eine unbekannte Domain (z. B. `someone@example.org`) liefert `eligible:false`.

## Tests / Builds

```bash
npm --prefix apps/api run test:cov
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
npm --prefix apps/api run seed
```

## Frontend

- Checkout (`/campaigns/:id`): nach einer Spende erscheint das Match-Offer (Arbeits-
  E-Mail → Angebot → Claim-CTA: Link öffnen oder PDF laden).
- Account (`/donor`): Match-Balance ("X € Match noch verfügbar dieses Jahr") +
  Claim-History mit Status.
