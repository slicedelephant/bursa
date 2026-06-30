# Quickstart — Feature 018 Multi-Channel Impact-Feed (E17)

## 1. Migration + Seed

```bash
cd apps/api
npx prisma migrate dev --name impact_feed     # oder migrate diff → deploy (s. u.)
npm run seed                                   # idempotent
npx prisma migrate status                      # up to date
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --exit-code   # "No difference detected"
```

Falls `migrate dev` non-interaktiv blockt:
```bash
mkdir -p prisma/migrations/<timestamp>_impact_feed
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_impact_feed/migration.sql
npx prisma migrate deploy
```

## 2. Tests + Builds

```bash
npm --prefix apps/api run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/web run test:cov     # alle Suites grün, Per-Path-80%-Gates
npm --prefix apps/api run build
npm --prefix apps/web run build
```

## 3. Messaging-Provider (Default mock, kein Key nötig)

```bash
# Default — ohne Env-Variable läuft der MockMessagingProvider (kein Netz, kein Key):
npm --prefix apps/api start

# Optional die Real-Skeletons auswählen (laufen nie in Tests; brauchen Credentials):
MESSAGING_PROVIDER=whatsapp WHATSAPP_TOKEN=… WHATSAPP_PHONE_ID=… npm --prefix apps/api start
MESSAGING_PROVIDER=telegram TELEGRAM_BOT_TOKEN=… npm --prefix apps/api start
```
Ohne gesetzte Credentials fällt die Factory auf den Mock zurück — die App bleibt lauffähig.

## 4. API-Smoke (DONOR-Token vorausgesetzt)

```bash
# Personalisierter Feed + Read-Streak
curl -s localhost:3000/api/feed -H "authorization: Bearer $DONOR_TOKEN" | jq

# Ein Item als gelesen markieren (Key aus dem Feed)
curl -s -XPOST localhost:3000/api/feed/voice:msg_123/read \
  -H "authorization: Bearer $DONOR_TOKEN" | jq

# Kanal-Präferenzen lesen + WhatsApp opt-in
curl -s localhost:3000/api/feed/channel-prefs \
  -H "authorization: Bearer $DONOR_TOKEN" | jq
curl -s -XPUT localhost:3000/api/feed/channel-prefs \
  -H "authorization: Bearer $DONOR_TOKEN" -H 'content-type: application/json' \
  -d '{"channel":"WHATSAPP","optIn":true,"handle":"+4915112345678"}' | jq

# Inaktivitäts-Status + Reminder
curl -s localhost:3000/api/feed/inactivity \
  -H "authorization: Bearer $DONOR_TOKEN" | jq
```

## 5. Student-Voice-Smoke (STUDENT-Token + eigene Kampagne)

```bash
# Sauber → APPROVED + an Opt-in-Spender gefächert (gemockt)
curl -s -XPOST localhost:3000/api/campaigns/$CAMPAIGN_ID/voice \
  -H "authorization: Bearer $STUDENT_TOKEN" -H 'content-type: application/json' \
  -d '{"text":"Thank you for supporting my MBA journey.","videoUrl":"https://example.com/t.mp4"}' | jq

# Mit Slur/Keyword → REJECTED mit Gründen, kein Send
curl -s -XPOST localhost:3000/api/campaigns/$CAMPAIGN_ID/voice \
  -H "authorization: Bearer $STUDENT_TOKEN" -H 'content-type: application/json' \
  -d '{"text":"guaranteed return double your money"}' | jq
```

## 6. Frontend

`npm --prefix apps/web start` → der Donor-Account zeigt den swipebaren Impact-Feed
(Story-Cards mit mark-as-read), das Kanal-Präferenzen-Panel (Opt-in WhatsApp/Telegram/
E-Mail-Digest/Push), die Read-Streak und — bei Inaktivität — das Reminder-Banner mit
1-Tap-Donate-CTA. Die Studierenden-Seite zeigt die "Send a thank-you message"-Fläche mit
Moderations-Feedback.

## Erwartete Invarianten

- `migrate diff --exit-code` → "No difference detected".
- Ohne `MESSAGING_PROVIDER` läuft der Mock (kein Netz, kein Key).
- Nichts in E17 verändert einen Donation-Betrag/-Status/-Payout — Geld geht an die Schule.
- Der E4-E-Mail-Danke-Pfad ist unverändert.
- Nur APPROVED Student-Voices erscheinen im Feed / werden gefächert.
- Ein Feed-Item zählt einmal pro Spender (`FeedRead @@unique`).
- `IN_APP` ist immer aktiv und nicht abwählbar.
