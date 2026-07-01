# Quickstart — Feature 019 Gruppen-Engine (E18)

## 1. Migration + Seed

```bash
cd apps/api
npx prisma migrate dev --name groups_engine     # oder migrate diff → deploy (s. u.)
npm run seed                                     # idempotent
npx prisma migrate status                        # up to date
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # "No difference detected"
```

Falls `migrate dev` non-interaktiv blockt:
```bash
mkdir -p prisma/migrations/<timestamp>_groups_engine
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_groups_engine/migration.sql
npx prisma migrate deploy
```

## 2. Tests + Builds

```bash
npm --prefix apps/api run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/web run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 3. API-Smoke (Tokens vorausgesetzt)

```bash
# Giving Circle anlegen (DONOR-Token) → Ersteller wird ADMIN
curl -s -XPOST localhost:3000/api/groups \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"mode":"GIVING_CIRCLE","visibility":"PUBLIC","name":"Lagos Alumni Circle","sharedGoalCents":500000}' | jq

# Meine + öffentliche Gruppen
curl -s localhost:3000/api/groups -H "authorization: Bearer $DONOR_TOKEN" | jq

# Invite-Link erstellen (ADMIN) → Roh-Token nur in der URL
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/invites \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"role":"CONTRIBUTOR","expiresInDays":14}' | jq

# Beitreten (anderer User) mit dem Roh-Token aus dem Link
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/join \
  -H "authorization: Bearer $OTHER_TOKEN" -H 'content-type: application/json' \
  -d '{"token":"'$RAW_TOKEN'"}' | jq

# Group-Detail (Shared-Goal, Stretch, Leaderboard, Members)
curl -s localhost:3000/api/groups/$GROUP_ID -H "authorization: Bearer $DONOR_TOKEN" | jq

# Voting öffnen + abstimmen + Stand
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/votes \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"question":"Who next?","options":[{"campaignId":"c_amara","label":"Amara"}]}' | jq
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/votes/$VOTE_ID/ballot \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"optionId":"'$OPTION_ID'"}' | jq
curl -s localhost:3000/api/groups/$GROUP_ID/votes/$VOTE_ID \
  -H "authorization: Bearer $DONOR_TOKEN" | jq

# Moderierter Chat: sauber → APPROVED, mit Slur → REJECTED
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/messages \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"text":"Great progress this week, team!"}' | jq
curl -s -XPOST localhost:3000/api/groups/$GROUP_ID/messages \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"text":"you idiot"}' | jq
curl -s localhost:3000/api/groups/$GROUP_ID/messages \
  -H "authorization: Bearer $DONOR_TOKEN" | jq
```

## 4. Cohort-Match (E5-Flow, kein neuer Payment-Pfad)

```bash
# Cohort anlegen (STUDENT), Sub-Kampagnen verknüpfen, dann als Sponsor die Kohorte matchen.
curl -s -XPOST localhost:3000/api/groups/$COHORT_ID/campaigns \
  -H "authorization: Bearer $STUDENT_TOKEN" -H 'content-type: application/json' \
  -d '{"campaignId":"'$CAMPAIGN_ID'"}' | jq

# Corporate matched die ganze Kohorte → E5 sponsert je Sub-Kampagne (Geld an die Schule)
curl -s -XPOST localhost:3000/api/groups/$COHORT_ID/match \
  -H "authorization: Bearer $SPONSOR_TOKEN" -H 'content-type: application/json' \
  -d '{"totalCents":600000,"tier":"CUSTOM","method":"SEPA","scholarshipName":"Acme Cohort Match"}' | jq
```

## 5. Frontend

`npm --prefix apps/web start` → `/groups` zeigt meine + öffentliche Gruppen und das
Create-Group-Formular (Modus-Wahl). Die Detail-Seite zeigt die gemeinsame Progress-Bar, die
Stretch-Goal-Anzeige, die Mitglieder-Liste mit Rollen, das Leaderboard, die Sub-Kampagnen
(Cohort) bzw. das Portfolio (Circle), die Voting-UI und den moderierten Chat.

## Erwartete Invarianten

- `migrate diff --exit-code` → "No difference detected".
- Nichts in E18 verändert einen Donation-Betrag/-Status/-Payout — Geld geht an die Schule;
  der Cohort-Match läuft über den bestehenden E5-Flow.
- Eine Engine, zwei Modi: `Group.mode` diskriminiert Cohort vs. Circle.
- Mindestens ein `ADMIN` bleibt je Gruppe (letzter Admin kann nicht austreten/degradiert werden).
- Ein Mitglied stimmt einmal pro Vote ab (`GroupVoteBallot @@unique`).
- Nur `APPROVED` Chat-Nachrichten erscheinen in der Historie.
- Invites sind hash-only (Roh-Token nur im Link; E15/E8-Muster).
- Alle Leaderboards/Badges/Aggregate kommen aus den E16-Primitiven (kein neues System).
