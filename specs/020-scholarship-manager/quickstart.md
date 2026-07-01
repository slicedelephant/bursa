# Quickstart — Feature 020 Scholarship Program Manager (E19)

## 1. Migration + Seed

Bevorzugt:
```
cd apps/api
npx prisma migrate dev --name scholarship_manager
```

Falls `migrate dev` non-interaktiv blockiert, das SQL erzeugen und deployen:
```
cd apps/api
mkdir -p prisma/migrations/<timestamp>_scholarship_manager
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_scholarship_manager/migration.sql
npx prisma migrate deploy
npx prisma generate
```

Bestätigen:
```
npx prisma migrate status   # → Database schema is up to date!
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # → No difference detected
```

Seed (idempotent, legt ein gebrandetes Demo-Programm des Sponsors an):
```
npm --prefix apps/api run seed
```

## 2. Programm anlegen + branden (SPONSOR)
```
TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sponsor@acme.test","password":"bursa1234"}' | jq -r .data.accessToken)

curl -s -X POST localhost:3000/scholarship/programs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Acme Future Leaders","slug":"acme-future-leaders",
       "brandPrimary":"#123456","brandSecondary":"#abcdef",
       "year":2026,"budgetCents":6000000,"slots":3,"awardCents":2000000}' | jq
```

## 3. Application-Formular setzen
```
curl -s -X PUT localhost:3000/scholarship/programs/$PRG/form \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Application 2026","fields":[
        {"fieldKey":"why","label":"Why you?","type":"LONG_TEXT","required":true,"rubricWeight":3},
        {"fieldKey":"leadership","label":"Leadership","type":"SELECT","required":true,
         "options":["None","Team lead","Founder"],"rubricWeight":2}]}' | jq
```

## 4. Bewerben (öffentlich, Token-Link)
```
curl -s localhost:3000/apply/$APPLY_TOKEN | jq   # Schema laden
curl -s -X POST localhost:3000/apply/$APPLY_TOKEN \
  -H 'Content-Type: application/json' \
  -d '{"applicantName":"Amara O.","applicantEmail":"amara@x.test",
       "answers":{"why":"...","leadership":"Founder"}}' | jq
```

## 5. Reviewer scoren + Gewinner küren
```
curl -s -X POST localhost:3000/scholarship/programs/$PRG/reviewers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reviewerName":"Dana","reviewerEmail":"dana@acme.test"}' | jq

curl -s -X POST localhost:3000/scholarship/applications/$APP/scores \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reviewerId":"'$REV'","scores":[{"fieldKey":"why","score":5},
       {"fieldKey":"leadership","score":5}]}' | jq

curl -s -X POST localhost:3000/scholarship/programs/$PRG/decide \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"cycleYear":2026}' | jq
```

## 6. Auszahlung an die Schule + Conditional-Tranche
```
curl -s -X POST localhost:3000/scholarship/awards/$AWD/disburse \
  -H "Authorization: Bearer $TOKEN" | jq          # → payoutRef + ledgerRefId

curl -s -X POST localhost:3000/scholarship/awards/$AWD/release-tranche \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"gpa":3.8}' | jq                           # RELEASE (an die Schule) / HELD
```

## 7. SRM + Impact-Report + Renewal
```
curl -s -X PUT localhost:3000/scholarship/scholars/$SCL/status \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"event":"enroll"}' | jq

curl -s localhost:3000/scholarship/programs/$PRG/report.csv \
  -H "Authorization: Bearer $TOKEN" -o report.csv
curl -s localhost:3000/scholarship/programs/$PRG/report.pdf \
  -H "Authorization: Bearer $TOKEN" -o report.pdf

curl -s -X POST localhost:3000/scholarship/programs/$PRG/renew \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"budgetCents":6600000,"slots":3,"awardCents":2200000}' | jq
```

## 8. Frontend
```
npm --prefix apps/web start
# SPONSOR: /scholarship  (Programm-Admin, Builder, Reviewer-Konsole, Award, SRM)
# Öffentlich: /apply/<token>  (Bewerbungsformular mit Conditional-Sichtbarkeit)
```

## Erwartete Invarianten
- Jeder Award-Payout landet bei der **Schule** (nie beim Scholar) und erzeugt einen
  `LedgerEntry` mit `entryType: DISBURSEMENT`.
- Tranche 2 wird nur bei `gpa >= threshold` freigegeben und geht ebenfalls an die Schule.
- Ungültige Scholar-Status-Übergänge werden mit `400 INVALID_STATUS_TRANSITION` abgelehnt.
- Reviewer-Limit 10; Scores 0–5; SELECT-Antworten aus der Optionsliste; unsichtbare
  Conditional-Felder werden nie als Pflichtverletzung gewertet.
- Der Impact-Report zeigt Diversity-Metriken aus E14 (`aggregateDiversity`).
