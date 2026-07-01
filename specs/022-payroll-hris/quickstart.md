# Quickstart — Feature 022 Payroll-Match & HRIS-Kopplung (E21)

Alle Provider laufen per Default als Mock — keine echten HRIS-/OAuth-Keys nötig.

## 1. Migration + Seed

```bash
cd apps/api
# migrate dev, falls interaktiv möglich:
npx prisma migrate dev --name payroll_hris
# sonst nicht-interaktiv (siehe plan.md / tasks.md):
#   prisma migrate diff --from-url $DATABASE_URL \
#     --to-schema-datamodel prisma/schema.prisma --script > migration.sql
#   prisma migrate deploy && prisma migrate status
npm run seed
```

Der Seed legt einen Sponsor (ACME) mit einer Mock-ADP-`HrisConnection` (read-only Scopes), einem
`PayrollGivingProgram` + `PayrollMatchRule` (1:1, 500 € Cap), zwei aktivierten Payroll-Mitarbeitern
und einer gematchten `PayrollContribution` an, die als `CORPORATE`-Donation an eine Schule
ausgezahlt und im Ledger festgehalten wird (+ Audit-Trail).

## 2. HRIS verbinden (read-only Scopes)

```bash
curl -sX POST localhost:3000/payroll/connect -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SPONSOR_JWT" \
  -d '{"corporateProfileId":"<id>","provider":"ADP","scopes":["employees.read","payroll.read"],"programName":"ACME Giving"}'
# → { connectionId, status: "CONNECTED", programId }

# Ein Write-Scope wird abgelehnt:
curl -sX POST localhost:3000/payroll/connect ... -d '{"...","scopes":["employees.read","payroll.write"]}'
# → 400 INVALID_SCOPES
```

## 3. Mitarbeiter synchronisieren (Mock-Provider)

```bash
curl -sX POST localhost:3000/payroll/sync -H "Authorization: Bearer $SPONSOR_JWT" \
  -d '{"connectionId":"<id>"}'
# → { status: "SYNCED", employeeCount: N, syncedAt }
```

## 4. Match-Regel setzen (firmenweit)

```bash
curl -sX POST localhost:3000/payroll/rule -H "Authorization: Bearer $SPONSOR_JWT" \
  -d '{"programId":"<id>","matchRatio":100,"perEmployeeCapCents":50000}'
# 1:1, max 500 € pro Mitarbeiter/Jahr
```

## 5. Mitarbeiter opt-in (Employee-Seite)

```bash
curl -sX POST localhost:3000/payroll/activate -H "Authorization: Bearer $EMP_JWT" \
  -d '{"employeeProfileId":"<id>"}'
# → { active: true, remainingCents: 50000 }
```

## 6. Payroll-Giving-Campaign auslösen ("Match Month")

```bash
curl -sX POST localhost:3000/payroll/campaign -H "Authorization: Bearer $SPONSOR_JWT" \
  -d '{"programId":"<id>","campaignId":"<schoolCampaignId>","defaultContributionCents":10000}'
# → { contributions: N, totalContributionCents, totalMatchCents, totalToSchoolCents }
# Jeder Match wird als CORPORATE-Donation auf die Schul-Kampagne gebucht (Ledger-DISBURSEMENT/
# DONATION an die Schule) — nie an einen Mitarbeiter oder Studierenden.
```

## 7. Compliance-/Sync-Trail

```bash
curl -s "localhost:3000/payroll/trail?corporateProfileId=<id>" -H "Authorization: Bearer $SPONSOR_JWT"
# → [{ action: "payroll.hris.connect", ... }, { action: "payroll.hris.sync", ... },
#     { action: "payroll.campaign.run", ... }]
```

## 8. Frontend

- `/payroll/connect` (SPONSOR) — HRIS-Verbindungsstatus + Mock-OAuth-Connect + Sync.
- `/payroll` (SPONSOR) — aktivierte Mitarbeiter, Match-Regel-Config, Campaign-Trigger, Compliance-Trail.
- `/payroll/optin` (eingeloggt) — Employee-Opt-in + verbleibendes Budget.

## Erwartete Invarianten

- Ein Write-Scope beim Connect → `400 INVALID_SCOPES`.
- Jede gematchte Payroll-Spende landet als `CORPORATE`-Donation + Ledger-Eintrag bei der **Schule**.
- Der Per-Mitarbeiter-Cap wird respektiert (E13 `computeMatch` deckelt).
- Der Compliance-Trail listet Connect + Sync + Campaign lückenlos.
