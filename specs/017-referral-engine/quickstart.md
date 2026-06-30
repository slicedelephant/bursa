# Quickstart — Feature 017 Referral- & Advocate-Engine (E15)

## 1. Migration + Seed

```bash
cd apps/api
npx prisma migrate dev --name referral_engine   # oder migrate diff → deploy (s. u.)
npm run seed                                     # idempotent
npx prisma migrate status                        # up to date
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # "No difference detected"
```

Falls `migrate dev` non-interaktiv blockt:
```bash
mkdir -p prisma/migrations/<timestamp>_referral_engine
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_referral_engine/migration.sql
npx prisma migrate deploy
```

## 2. Tests + Builds

```bash
npm --prefix apps/api run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/web run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 3. API-Smoke (DONOR-Token vorausgesetzt)

```bash
# Referral-Link + Tracking
curl -s localhost:3000/api/donors/me/referral \
  -H "authorization: Bearer $DONOR_TOKEN" | jq

# opt-in Leaderboard
curl -s -XPOST localhost:3000/api/donors/me/referral/leaderboard-opt-in \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"optIn":true}' | jq

curl -s localhost:3000/api/referral/leaderboard \
  -H "authorization: Bearer $DONOR_TOKEN" | jq
```

## 4. Advocate-Smoke (STUDENT-Token + eigene Kampagne)

```bash
curl -s -XPOST localhost:3000/api/campaigns/$CAMPAIGN_ID/advocates \
  -H "authorization: Bearer $STUDENT_TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Jordan Alumni","email":"jordan@example.com"}' | jq   # shareUrl 1× sichtbar

curl -s localhost:3000/api/campaigns/$CAMPAIGN_ID/advocates \
  -H "authorization: Bearer $STUDENT_TOKEN" | jq

curl -s localhost:3000/api/campaigns/$CAMPAIGN_ID/advocate-leaderboard \
  -H "authorization: Bearer $DONOR_TOKEN" | jq
```

## 5. Frontend

`npm --prefix apps/web start` → Donor-Account zeigt das Referral-Panel (Link, Stats,
Reward, Share-Buttons, opt-in-Toggle); nach einer Spende erscheint die Referral-CTA. Die
Studierenden-Seite zeigt den Advocate-Manager; die öffentliche Kampagnen-Seite zeigt das
Advocate-Leaderboard.

## Hinweis Code-Anzeige

Der eigene Referral-Link des Spenders ist sein wiederkehrendes Share-Asset und wird neben
dem `codeHash` als anzeigbarer `code` persistiert — er erscheint bei jedem
`GET /donors/me/referral`. Advocate-Invite-Links dagegen sind hash-only: der Raw-Link
erscheint **einmalig** in der `POST /campaigns/:id/advocates`-Antwort.

## Erwartete Invarianten

- `migrate diff --exit-code` → "No difference detected".
- Attribution verändert keinen Donation-Betrag, keinen Status, keinen Payout — Geld geht
  unverändert an die Schule.
- Eine Spende zählt höchstens einmal (DB-Unique `ReferralAttribution.donationId`).
- ≤ 15 ACTIVE Advocates pro Kampagne.
- Reward-Tiers sind reine Feature-/Recognition-Belohnungen (keine Cash).
