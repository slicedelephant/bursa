# Quickstart 012 — Automated KYC & Verification Pipeline (E11)

## Voraussetzungen

- Postgres läuft (docker compose, Host-Port 5433).
- `apps/api/.env` mit `DATABASE_URL`. Default-Provider sind Mocks — keine KYC-/AML-Keys nötig.

## Env-Flags (alle optional, Default = Mock)

```
KYC_PROVIDER=mock        # oder "persona" (braucht PERSONA_API_KEY)
PERSONA_API_KEY=...      # nur für echten Identity-Provider

AML_PROVIDER=mock        # oder "sumsub" (braucht SUMSUB_API_KEY)
SUMSUB_API_KEY=...       # nur für echten AML-Provider
```

Ohne diese Variablen läuft die komplette Pipeline deterministisch ohne Netzwerk.

## Migration anwenden

Bevorzugt:
```
cd apps/api
npx prisma migrate dev --name kyc_verification
```

Falls `migrate dev` non-interaktiv blockiert, das SQL erzeugen und deployen:
```
cd apps/api
mkdir -p prisma/migrations/<timestamp>_kyc_verification
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_kyc_verification/migration.sql
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

Legt synthetische Verifikations-Fälle an: ein VERIFIED Student, ein MANUAL_REVIEW-Fall
(OCR-Mismatch), eine Demo-AML-Prüfung (Sponsor, HIT).

## Demo-Flow (curl, gegen laufende API)

Student (JWT als STUDENT):
```
# Vorgang starten
curl -XPOST localhost:3000/api/kyc/cases -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' -d '{"admissionRecordId":"<id>"}'

# Liveness (ok)   — Token auf "-FAIL" enden lassen, um Fehler zu demoen
curl -XPOST localhost:3000/api/kyc/cases/<caseId>/liveness -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' -d '{"livenessToken":"live_demo_ok"}'

# Dokument (ok)   — Token auf "-MISMATCH" enden lassen, um Mismatch zu demoen
curl -XPOST localhost:3000/api/kyc/cases/<caseId>/document -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' -d '{"documentToken":"doc_demo_ok","claimedName":"Amara Okonkwo"}'
```

Sponsor (JWT als SPONSOR):
```
curl -XPOST localhost:3000/api/kyc/aml/screen -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' -d '{"amountCents":600000,"country":"DE"}'
# country=RU → BLOCKED ; country=NG → HIT (grey-Liste, Mock) ; sonst CLEAR
```

Operator (JWT als ADMIN):
```
curl localhost:3000/api/kyc/review/queue -H "Authorization: Bearer $JWT"
curl -XPOST localhost:3000/api/kyc/review/<caseId>/decide -H "Authorization: Bearer $JWT" \
  -H 'content-type: application/json' -d '{"decision":"APPROVE","note":"Diploma matched"}'
curl localhost:3000/api/kyc/review/dashboard -H "Authorization: Bearer $JWT"
```

## Tests / Builds

```
npm --prefix apps/api run test:cov     # Per-Path-Gates grün
npm --prefix apps/web run test:cov
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## Frontend

- Student-Page → KYC-Verifikations-Sektion (Liveness/Dokument/Status).
- `/admin/kyc` (ADMIN) → Manual-Review-Queue + Decision.
- Sponsor-Page → AML-Status-Anzeige.

## Mock-Sentinels (deterministisch)

| Eingabe endet auf … | Ergebnis |
|---|---|
| `livenessToken` `-FAIL` | Liveness fehlgeschlagen → MANUAL_REVIEW |
| `documentToken` `-MISMATCH` | OCR-Name weicht ab → Namens-Mismatch → MANUAL_REVIEW |
| `country` sanktioniert (RU, IR, …) | AML BLOCKED → REJECTED |
| `country` grey (NG, PK, …) | AML HIT → MANUAL_REVIEW |
